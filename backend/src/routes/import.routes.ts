import { Router, Request, Response, NextFunction } from 'express';
import { listSystems, loadSystemConfig, systemExists } from '../services/import/configLoader.js';
import { parseFile, validateRequiredColumns } from '../services/import/fileParser.js';
import { mapColumns } from '../services/import/columnMapper.js';
import { transformData, groupByPatient } from '../services/import/dataTransformer.js';
import { validateRows } from '../services/import/validator.js';
import { generateErrorReport, getCondensedReport } from '../services/import/errorReporter.js';
import { createError } from '../middleware/errorHandler.js';
import { handleUpload } from '../middleware/upload.js';

const router = Router();

/**
 * GET /api/import/systems
 * List all available healthcare systems for import
 */
router.get('/systems', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const systems = listSystems();

    res.json({
      success: true,
      data: systems
    });
  } catch (error) {
    next(createError(`Failed to load systems: ${(error as Error).message}`, 500));
  }
});

/**
 * GET /api/import/systems/:systemId
 * Get configuration for a specific healthcare system
 */
router.get('/systems/:systemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { systemId } = req.params;

    if (!systemExists(systemId)) {
      return next(createError(`System not found: ${systemId}`, 404));
    }

    const config = loadSystemConfig(systemId);

    res.json({
      success: true,
      data: {
        id: systemId,
        name: config.name,
        version: config.version,
        patientColumns: Object.keys(config.patientColumns),
        measureColumns: Object.keys(config.measureColumns),
        qualityMeasures: [...new Set(Object.values(config.measureColumns).map(m => m.qualityMeasure))],
        skipColumns: config.skipColumns
      }
    });
  } catch (error) {
    next(createError(`Failed to load system config: ${(error as Error).message}`, 500));
  }
});

/**
 * POST /api/import/parse
 * Parse an uploaded file and return the parsed data
 * Used for testing and previewing file content
 */
router.post('/parse', handleUpload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const systemId = req.body.systemId || 'hill';

    if (!file) {
      return next(createError('No file uploaded', 400));
    }

    // Parse the file
    const parseResult = parseFile(file.buffer, file.originalname);

    // Load system config to validate columns
    let columnValidation = null;
    if (systemExists(systemId)) {
      const config = loadSystemConfig(systemId);
      const requiredPatientColumns = Object.keys(config.patientColumns);
      columnValidation = validateRequiredColumns(parseResult.headers, requiredPatientColumns);
    }

    res.json({
      success: true,
      data: {
        fileName: parseResult.fileName,
        fileType: parseResult.fileType,
        totalRows: parseResult.totalRows,
        headers: parseResult.headers,
        columnValidation,
        // Return first 10 rows as preview
        previewRows: parseResult.rows.slice(0, 10)
      }
    });
  } catch (error) {
    next(createError(`Failed to parse file: ${(error as Error).message}`, 400));
  }
});

/**
 * POST /api/import/analyze
 * Analyze column mappings for an uploaded file
 */
router.post('/analyze', handleUpload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const systemId = req.body.systemId || 'hill';

    if (!file) {
      return next(createError('No file uploaded', 400));
    }

    if (!systemExists(systemId)) {
      return next(createError(`System not found: ${systemId}`, 404));
    }

    // Parse the file
    const parseResult = parseFile(file.buffer, file.originalname);

    // Analyze column mappings
    const mappingResult = mapColumns(parseResult.headers, systemId);

    res.json({
      success: true,
      data: {
        fileName: parseResult.fileName,
        fileType: parseResult.fileType,
        totalRows: parseResult.totalRows,
        mapping: mappingResult
      }
    });
  } catch (error) {
    next(createError(`Failed to analyze file: ${(error as Error).message}`, 400));
  }
});

/**
 * POST /api/import/transform
 * Transform file data from wide format to long format
 * Returns transformed rows ready for preview/import
 */
router.post('/transform', handleUpload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const systemId = req.body.systemId || 'hill';

    if (!file) {
      return next(createError('No file uploaded', 400));
    }

    if (!systemExists(systemId)) {
      return next(createError(`System not found: ${systemId}`, 404));
    }

    // Parse the file
    const parseResult = parseFile(file.buffer, file.originalname);

    // Transform the data (pass dataStartRow for correct row number display)
    const transformResult = transformData(
      parseResult.headers,
      parseResult.rows,
      systemId,
      parseResult.dataStartRow
    );

    // Group by patient for summary
    const patientGroups = groupByPatient(transformResult.rows);

    res.json({
      success: true,
      data: {
        fileName: parseResult.fileName,
        fileType: parseResult.fileType,
        dataStartRow: transformResult.dataStartRow, // For UI to calculate display row numbers
        stats: {
          ...transformResult.stats,
          uniquePatients: patientGroups.size
        },
        mapping: {
          mapped: transformResult.mapping.stats.mapped,
          skipped: transformResult.mapping.stats.skipped,
          unmapped: transformResult.mapping.stats.unmapped,
          unmappedColumns: transformResult.mapping.unmappedColumns.slice(0, 10), // First 10 unmapped
          missingRequired: transformResult.mapping.missingRequired
        },
        errors: transformResult.errors.slice(0, 20), // First 20 errors
        patientsWithNoMeasures: transformResult.patientsWithNoMeasures, // Patients with no measures
        // Preview first 20 transformed rows
        previewRows: transformResult.rows.slice(0, 20)
      }
    });
  } catch (error) {
    next(createError(`Failed to transform file: ${(error as Error).message}`, 400));
  }
});

/**
 * POST /api/import/validate
 * Validate transformed data before import
 * Returns validation results with errors, warnings, and duplicates
 */
router.post('/validate', handleUpload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const systemId = req.body.systemId || 'hill';

    if (!file) {
      return next(createError('No file uploaded', 400));
    }

    if (!systemExists(systemId)) {
      return next(createError(`System not found: ${systemId}`, 404));
    }

    // Parse the file
    const parseResult = parseFile(file.buffer, file.originalname);

    // Transform the data (pass dataStartRow for correct row number display)
    const transformResult = transformData(
      parseResult.headers,
      parseResult.rows,
      systemId,
      parseResult.dataStartRow
    );

    // Validate the transformed data
    const validationResult = validateRows(transformResult.rows);

    // Generate error report
    const errorReport = generateErrorReport(validationResult, transformResult.rows);
    const condensedReport = getCondensedReport(errorReport);

    // Group by patient for summary
    const patientGroups = groupByPatient(transformResult.rows);

    res.json({
      success: true,
      data: {
        fileName: parseResult.fileName,
        fileType: parseResult.fileType,
        dataStartRow: transformResult.dataStartRow, // For UI to calculate display row numbers
        transformStats: {
          inputRows: transformResult.stats.inputRows,
          outputRows: transformResult.stats.outputRows,
          uniquePatients: patientGroups.size,
          patientsWithNoMeasures: transformResult.stats.patientsWithNoMeasures
        },
        patientsWithNoMeasures: transformResult.patientsWithNoMeasures,
        validation: {
          valid: validationResult.valid,
          canProceed: condensedReport.summary.canProceed,
          stats: validationResult.stats,
          summary: condensedReport.summary,
          errors: condensedReport.topErrors,
          warnings: condensedReport.topWarnings,
          duplicates: condensedReport.duplicates
        },
        // Preview first 20 transformed rows
        previewRows: transformResult.rows.slice(0, 20)
      }
    });
  } catch (error) {
    next(createError(`Failed to validate file: ${(error as Error).message}`, 400));
  }
});

export default router;
