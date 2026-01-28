import { Router, Request, Response, NextFunction } from 'express';
import { listSystems, loadSystemConfig, systemExists } from '../services/import/configLoader.js';
import { parseFile, validateRequiredColumns } from '../services/import/fileParser.js';
import { mapColumns } from '../services/import/columnMapper.js';
import { transformData, groupByPatient } from '../services/import/dataTransformer.js';
import { validateRows } from '../services/import/validator.js';
import { generateErrorReport, getCondensedReport } from '../services/import/errorReporter.js';
import { calculateDiff, ImportMode, filterChangesByAction, getModifyingChanges } from '../services/import/diffCalculator.js';
import { storePreview, getPreview, deletePreview, getPreviewSummary, getCacheStats } from '../services/import/previewCache.js';
import { executeImport } from '../services/import/importExecutor.js';
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

/**
 * POST /api/import/preview
 * Generate a diff preview comparing import data vs existing database
 * Stores the preview in cache for later commit
 */
router.post('/preview', handleUpload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const systemId = req.body.systemId || 'hill';
    const mode: ImportMode = req.body.mode === 'replace' ? 'replace' : 'merge';

    if (!file) {
      return next(createError('No file uploaded', 400));
    }

    if (!systemExists(systemId)) {
      return next(createError(`System not found: ${systemId}`, 404));
    }

    // Step 1: Parse the file
    const parseResult = parseFile(file.buffer, file.originalname);

    // Step 2: Transform the data
    const transformResult = transformData(
      parseResult.headers,
      parseResult.rows,
      systemId,
      parseResult.dataStartRow
    );

    // Step 3: Validate the transformed data
    const validationResult = validateRows(transformResult.rows);
    const errorReport = generateErrorReport(validationResult, transformResult.rows);
    const condensedReport = getCondensedReport(errorReport);

    // Check if we can proceed (no blocking errors)
    if (!condensedReport.summary.canProceed) {
      return res.json({
        success: false,
        error: {
          message: 'Validation failed - fix errors before preview',
          details: condensedReport.summary.message
        },
        data: {
          validation: {
            canProceed: false,
            stats: validationResult.stats,
            errors: condensedReport.topErrors
          }
        }
      });
    }

    // Step 4: Calculate diff against database
    const diffResult = await calculateDiff(transformResult.rows, mode);

    // Step 5: Store in preview cache
    const previewId = storePreview(
      systemId,
      mode,
      diffResult,
      transformResult.rows,
      validationResult
    );

    // Get the stored entry for summary
    const previewEntry = getPreview(previewId)!;

    res.json({
      success: true,
      data: {
        previewId,
        systemId,
        mode,
        fileName: parseResult.fileName,
        expiresAt: previewEntry.expiresAt.toISOString(),
        // Summary stats
        summary: {
          inserts: diffResult.summary.inserts,
          updates: diffResult.summary.updates,
          skips: diffResult.summary.skips,
          duplicates: diffResult.summary.duplicates,
          deletes: diffResult.summary.deletes,
          total: diffResult.changes.length,
          modifying: getModifyingChanges(diffResult.changes).length
        },
        patients: {
          new: diffResult.newPatients,
          existing: diffResult.existingPatients,
          total: diffResult.newPatients + diffResult.existingPatients
        },
        validation: {
          warnings: condensedReport.topWarnings.length,
          duplicatesInFile: validationResult.stats.duplicateGroups
        },
        // Preview of changes (first 50)
        changes: diffResult.changes.slice(0, 50).map(change => ({
          action: change.action,
          memberName: change.memberName,
          memberDob: change.memberDob,
          requestType: change.requestType,
          qualityMeasure: change.qualityMeasure,
          oldStatus: change.oldStatus,
          newStatus: change.newStatus,
          reason: change.reason
        }))
      }
    });
  } catch (error) {
    next(createError(`Failed to generate preview: ${(error as Error).message}`, 500));
  }
});

/**
 * GET /api/import/preview/:previewId
 * Get a stored preview by ID
 */
router.get('/preview/:previewId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { previewId } = req.params;
    const entry = getPreview(previewId);

    if (!entry) {
      return next(createError('Preview not found or expired', 404));
    }

    // Get changes filtered by action if requested
    const actionFilter = req.query.action as string | undefined;
    let changes = entry.diff.changes;

    if (actionFilter && ['INSERT', 'UPDATE', 'SKIP', 'BOTH', 'DELETE'].includes(actionFilter)) {
      changes = filterChangesByAction(changes, actionFilter as any);
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;
    const paginatedChanges = changes.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        ...getPreviewSummary(entry),
        patients: {
          new: entry.diff.newPatients,
          existing: entry.diff.existingPatients,
          total: entry.diff.newPatients + entry.diff.existingPatients
        },
        changes: {
          total: changes.length,
          page,
          limit,
          items: paginatedChanges.map(change => ({
            action: change.action,
            memberName: change.memberName,
            memberDob: change.memberDob,
            requestType: change.requestType,
            qualityMeasure: change.qualityMeasure,
            oldStatus: change.oldStatus,
            newStatus: change.newStatus,
            reason: change.reason
          }))
        }
      }
    });
  } catch (error) {
    next(createError(`Failed to get preview: ${(error as Error).message}`, 500));
  }
});

/**
 * DELETE /api/import/preview/:previewId
 * Delete a stored preview
 */
router.delete('/preview/:previewId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { previewId } = req.params;
    const deleted = deletePreview(previewId);

    if (!deleted) {
      return next(createError('Preview not found', 404));
    }

    res.json({
      success: true,
      message: 'Preview deleted successfully'
    });
  } catch (error) {
    next(createError(`Failed to delete preview: ${(error as Error).message}`, 500));
  }
});

/**
 * POST /api/import/execute/:previewId
 * Execute an import based on a cached preview
 * Commits the changes to the database
 */
router.post('/execute/:previewId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { previewId } = req.params;

    // Check if preview exists before executing
    const preview = getPreview(previewId);
    if (!preview) {
      return next(createError('Preview not found or expired', 404));
    }

    // Execute the import
    const result = await executeImport(previewId);

    res.json({
      success: result.success,
      data: {
        mode: result.mode,
        stats: result.stats,
        duration: result.duration,
        errors: result.errors.length > 0 ? result.errors : undefined
      },
      message: result.success
        ? `Import completed: ${result.stats.inserted} inserted, ${result.stats.updated} updated, ${result.stats.deleted} deleted, ${result.stats.skipped} skipped, ${result.stats.bothKept} kept both`
        : `Import completed with ${result.errors.length} error(s)`
    });
  } catch (error) {
    next(createError(`Failed to execute import: ${(error as Error).message}`, 500));
  }
});

/**
 * GET /api/import/preview-cache/stats
 * Get preview cache statistics (for debugging/monitoring)
 */
router.get('/preview-cache/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = getCacheStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(createError(`Failed to get cache stats: ${(error as Error).message}`, 500));
  }
});

export default router;
