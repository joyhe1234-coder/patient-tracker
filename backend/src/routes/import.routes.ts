import { Router, Request, Response, NextFunction } from 'express';
import { listSystems, loadSystemConfig, loadMergedConfig, systemExists, isHillConfig, isSutterConfig, getRequiredColumns } from '../services/import/configLoader.js';
import { parseFile, parseExcel, validateRequiredColumns, getSheetNames, getWorkbookInfo, getSheetHeaders } from '../services/import/fileParser.js';
import { mapColumns } from '../services/import/columnMapper.js';
import { transformData, groupByPatient } from '../services/import/dataTransformer.js';
import { validateRows } from '../services/import/validator.js';
import { generateErrorReport, getCondensedReport } from '../services/import/errorReporter.js';
import { calculateDiff, ImportMode, filterChangesByAction, getModifyingChanges, detectReassignments } from '../services/import/diffCalculator.js';
import { storePreview, getPreview, deletePreview, getPreviewSummary, getCacheStats } from '../services/import/previewCache.js';
import { executeImport } from '../services/import/importExecutor.js';
import { createError } from '../middleware/errorHandler.js';
import { handleUpload } from '../middleware/upload.js';
import { requireAuth, requirePatientDataAccess } from '../middleware/auth.js';
import { isStaffAssignedToPhysician } from '../services/authService.js';
import { socketIdMiddleware } from '../middleware/socketIdMiddleware.js';
import { broadcastToRoom, getRoomName } from '../services/socketManager.js';
import { detectConflicts } from '../services/import/conflictDetector.js';
import { fuzzyMatch } from '../services/import/fuzzyMatcher.js';
import type { SutterSystemConfig, SkipTabPattern, RequiredColumns, PreviewColumnDef } from '../services/import/configLoader.js';
import type { TransformedRow } from '../services/import/dataTransformer.js';
import type { SutterTransformResult } from '../services/import/sutterDataTransformer.js';

const router = Router();

// Import routes require authentication and patient data access (PHYSICIAN or STAFF)
router.use(requireAuth);
router.use(requirePatientDataAccess);
router.use(socketIdMiddleware);

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
        measureColumns: isHillConfig(config) ? Object.keys(config.measureColumns) : [],
        qualityMeasures: isHillConfig(config)
          ? [...new Set(Object.values(config.measureColumns).map(m => m.qualityMeasure))]
          : [],
        skipColumns: isHillConfig(config) ? config.skipColumns : []
      }
    });
  } catch (error) {
    next(createError(`Failed to load system config: ${(error as Error).message}`, 500));
  }
});

/**
 * Check whether a tab name matches a skipTabs pattern.
 */
function matchesSkipPattern(tabName: string, pattern: SkipTabPattern): boolean {
  switch (pattern.type) {
    case 'suffix':
      return tabName.endsWith(pattern.value);
    case 'prefix':
      return tabName.startsWith(pattern.value);
    case 'exact':
      return tabName === pattern.value;
    case 'contains':
      return tabName.includes(pattern.value);
    default:
      return false;
  }
}

/**
 * Interface for sheets that fail header validation.
 */
interface InvalidSheet {
  name: string;
  reason: string;
}

/**
 * Validate sheet headers against required columns from system config.
 * Case-insensitive, whitespace-trimmed comparison.
 * @param sheetName - Name of the sheet being validated
 * @param headers - Array of header strings from the sheet
 * @param required - Required columns derived from system config
 * @returns null if valid, { name, reason } if invalid
 */
function validateSheetHeaders(
  sheetName: string,
  headers: string[],
  required: RequiredColumns
): InvalidSheet | null {
  // Build set of lowercase trimmed headers
  const nonEmptyHeaders = headers.filter(h => h.trim() !== '');
  const headerSet = new Set(nonEmptyHeaders.map(h => h.toLowerCase().trim()));

  // Check minimum 3 non-empty cells
  if (nonEmptyHeaders.length < 3) {
    return { name: sheetName, reason: 'Too few columns (minimum 3 required)' };
  }

  // Check all patient columns present (case-insensitive, with fuzzy fallback)
  const missingPatient = required.patientColumns.filter(col => {
    // First: exact case-insensitive match
    if (headerSet.has(col.toLowerCase().trim())) return false;
    // Fallback: fuzzy match against all file headers (lower threshold than conflict detection)
    const fuzzyResults = fuzzyMatch(col, nonEmptyHeaders, 0.70);
    return fuzzyResults.length === 0; // Still missing if no fuzzy match
  });
  if (missingPatient.length > 0) {
    return { name: sheetName, reason: `Missing patient columns: ${missingPatient.join(', ')}` };
  }

  // Check at least minDataColumns data columns present.
  // For Hill configs, file headers may have Q1/Q2 suffixes (e.g., "Breast Cancer Screening E Q1")
  // that the config key lacks ("Breast Cancer Screening E"), so also check with suffixes.
  const matchedDataColumns = required.dataColumns.filter(col => {
    const lc = col.toLowerCase().trim();
    return headerSet.has(lc)
      || headerSet.has(lc + ' q1')
      || headerSet.has(lc + ' q2');
  });
  if (matchedDataColumns.length < required.minDataColumns) {
    return { name: sheetName, reason: `Missing data columns (need at least ${required.minDataColumns})` };
  }

  return null;
}

/**
 * Build extraData for a DiffChange from the corresponding TransformedRow.
 * Uses previewColumns config to know which fields to extract.
 */
function buildExtraData(
  row: TransformedRow | undefined,
  previewColumns: PreviewColumnDef[]
): Record<string, string | null> | undefined {
  if (!row || previewColumns.length === 0) return undefined;

  const extraData: Record<string, string | null> = {};
  for (const col of previewColumns) {
    const value = (row as unknown as Record<string, unknown>)[col.field];
    extraData[col.field] = value != null ? String(value) : null;
  }
  return extraData;
}

/**
 * POST /api/import/sheets
 * Discover sheet/tab names in an uploaded Excel workbook.
 * Applies skipTabs filters and header-based validation from system config.
 * Returns the valid physician data tabs for selection.
 */
router.post('/sheets', handleUpload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const systemId = req.body.systemId || 'hill';

    if (!file) {
      return next(createError('No file uploaded', 400));
    }

    if (!systemExists(systemId)) {
      return next(createError(`System not found: ${systemId}`, 404));
    }

    // Step 1: Get workbook info (single XLSX.read() call)
    const { sheetNames: allSheets, workbook } = getWorkbookInfo(file.buffer);
    const totalSheets = allSheets.length;

    // Step 2: Load config and apply name-based filtering (skipTabs)
    const config = loadSystemConfig(systemId);
    let skippedSheets: string[] = [];

    if (isSutterConfig(config) && config.skipTabs && config.skipTabs.length > 0) {
      skippedSheets = allSheets.filter(tab =>
        config.skipTabs.some(pattern => matchesSkipPattern(tab, pattern))
      );
    }

    const candidateSheets = allSheets.filter(tab => !skippedSheets.includes(tab));

    // Step 3: Get required columns from config
    const required = getRequiredColumns(config);

    // Step 4: Get headers for candidate sheets
    // CSV files always have headers on row 0 (no metadata rows), regardless of config.headerRow
    const fileName = file.originalname?.toLowerCase() || '';
    const isCSV = fileName.endsWith('.csv');
    const headerRowIndex = isCSV ? 0 : (config.headerRow ?? 0);
    const headerMap = getSheetHeaders(workbook, candidateSheets, headerRowIndex);

    // Step 5: Validate each candidate sheet's headers
    const validSheets: string[] = [];
    const invalidSheets: InvalidSheet[] = [];

    for (const sheetName of candidateSheets) {
      const headers = headerMap.get(sheetName) || [];
      const result = validateSheetHeaders(sheetName, headers, required);
      if (result) {
        invalidSheets.push(result);
      } else {
        validSheets.push(sheetName);
      }
    }

    // Step 6: Error if no valid sheets remain
    if (validSheets.length === 0) {
      let message: string;
      if (skippedSheets.length > 0 && invalidSheets.length > 0) {
        message = `No valid data tabs found. ${skippedSheets.length} excluded by name, ${invalidSheets.length} excluded due to missing columns.`;
      } else if (invalidSheets.length > 0) {
        message = `No valid data tabs found. ${invalidSheets.length} tab(s) excluded due to missing required columns.`;
      } else {
        message = 'No valid tabs found in the uploaded file.';
      }
      return next(createError(message, 400, 'NO_VALID_TABS'));
    }

    // Step 7: Return results
    res.json({
      success: true,
      data: {
        sheets: validSheets,
        totalSheets,
        filteredSheets: validSheets.length,
        skippedSheets,
        invalidSheets
      }
    });
  } catch (error) {
    next(createError(`Failed to read sheets: ${(error as Error).message}`, 400));
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
    const validationResult = validateRows(transformResult.rows, systemId);

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
 *
 * Query params:
 * - physicianId: (optional) For STAFF/ADMIN, the target physician for imported patients
 *
 * Form fields:
 * - systemId: (optional) Healthcare system ID (default: 'hill')
 * - mode: (optional) Import mode: 'merge' or 'replace' (default: 'merge')
 * - sheetName: (optional for Hill, REQUIRED for Sutter) Tab name to import from
 */
router.post('/preview', handleUpload, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const systemId = req.body.systemId || 'hill';
    const mode: ImportMode = req.body.mode === 'replace' ? 'replace' : 'merge';
    const sheetName: string | undefined = req.body.sheetName || undefined;
    const user = req.user!;

    if (!file) {
      return next(createError('No file uploaded', 400));
    }

    if (!systemExists(systemId)) {
      return next(createError(`System not found: ${systemId}`, 404));
    }

    // Load config to check system-specific requirements
    const config = loadSystemConfig(systemId);

    // For Sutter imports, sheetName is required
    if (isSutterConfig(config) && !sheetName) {
      return next(createError('sheetName is required for Sutter imports', 400, 'MISSING_SHEET_NAME'));
    }

    // Validate sheetName exists in workbook if provided
    if (sheetName) {
      const availableSheets = getSheetNames(file.buffer);
      if (!availableSheets.includes(sheetName)) {
        return next(createError(
          `Sheet "${sheetName}" not found in workbook. Available sheets: ${availableSheets.join(', ')}`,
          400,
          'INVALID_SHEET_NAME'
        ));
      }
    }

    // Determine target ownerId based on user roles
    let targetOwnerId: number | null = null;

    // STAFF must specify physicianId and can only import to assigned physicians
    if (user.roles.includes('STAFF')) {
      const physicianIdParam = req.query.physicianId as string | undefined;
      if (!physicianIdParam) {
        return next(createError('physicianId query parameter is required for STAFF users', 400, 'MISSING_PHYSICIAN_ID'));
      }

      const physicianId = parseInt(physicianIdParam, 10);
      if (isNaN(physicianId)) {
        return next(createError('Invalid physicianId', 400, 'INVALID_PHYSICIAN_ID'));
      }

      // Verify STAFF is assigned to this physician
      const isAssigned = await isStaffAssignedToPhysician(user.id, physicianId);
      if (!isAssigned) {
        return next(createError('You are not assigned to this physician', 403, 'NOT_ASSIGNED'));
      }

      targetOwnerId = physicianId;
    }
    // ADMIN can optionally specify physicianId (otherwise imports to unassigned)
    else if (user.roles.includes('ADMIN')) {
      const physicianIdParam = req.query.physicianId as string | undefined;
      if (physicianIdParam) {
        const physicianId = parseInt(physicianIdParam, 10);
        if (isNaN(physicianId)) {
          return next(createError('Invalid physicianId', 400, 'INVALID_PHYSICIAN_ID'));
        }
        targetOwnerId = physicianId;
      }
      // If no physicianId specified, targetOwnerId remains null (unassigned)
    }
    // PHYSICIAN (without ADMIN/STAFF) imports to their own patients
    else if (user.roles.includes('PHYSICIAN')) {
      targetOwnerId = user.id;
    }

    // Step 1: Parse the file (with sheetName/headerRow for Sutter)
    let parseResult;
    if (isSutterConfig(config) && sheetName) {
      // Sutter: use parseExcel directly with sheet selection and headerRow from config
      // CSV files always have headers on row 0 (no metadata rows)
      const fileIsCSV = file.originalname?.toLowerCase().endsWith('.csv');
      parseResult = parseExcel(file.buffer, file.originalname, {
        sheetName,
        headerRow: fileIsCSV ? 0 : config.headerRow,
      });
    } else {
      parseResult = parseFile(file.buffer, file.originalname);
    }

    // Task 26c: Validate selected tab has data rows
    if (parseResult.totalRows === 0) {
      return next(createError('Selected tab has no patient data rows', 400, 'EMPTY_TAB'));
    }

    // Step 1b: Conflict detection -- compare file headers against merged config
    const mergedConfig = await loadMergedConfig(systemId);
    const conflictReport = detectConflicts(parseResult.headers, mergedConfig, systemId);

    // Wrong-file check: file does not match the selected system at all
    if (conflictReport.isWrongFile) {
      return next(createError(
        'No recognizable columns found. This file may not be from the selected insurance system.',
        400,
        'WRONG_FILE'
      ));
    }

    // If BLOCKING conflicts exist, return early with the conflict report
    // WARNING/INFO conflicts (e.g., skip column variations) don't block the import
    if (conflictReport.hasBlockingConflicts) {
      return res.json({
        success: true,
        data: {
          hasConflicts: true,
          conflicts: conflictReport,
        },
      });
    }

    // Step 2: Transform the data
    const transformResult = transformData(
      parseResult.headers,
      parseResult.rows,
      systemId,
      parseResult.dataStartRow
    );

    // Step 3: Validate the transformed data
    const validationResult = validateRows(transformResult.rows, systemId);
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

    // Step 4: Calculate diff against database (filtered by target owner)
    const diffResult = await calculateDiff(transformResult.rows, mode, targetOwnerId);

    // Step 5: Detect patient reassignments (existing patients that would change owner)
    const reassignments = await detectReassignments(transformResult.rows, targetOwnerId);

    // Step 5b: Build sourceRowIndex -> TransformedRow map for extraData
    const previewColumns = config.previewColumns || [];
    const rowBySourceIndex = new Map<number, TransformedRow>();
    if (previewColumns.length > 0) {
      for (const row of transformResult.rows) {
        rowBySourceIndex.set(row.sourceRowIndex, row);
      }
      // Attach extraData to each diff change
      for (const change of diffResult.changes) {
        if (change.sourceRowIndex !== undefined) {
          const srcRow = rowBySourceIndex.get(change.sourceRowIndex);
          change.extraData = buildExtraData(srcRow, previewColumns);
        }
      }
    }

    // Step 6: Extract unmappedActions from Sutter transform result (Task 29)
    const sutterResult = transformResult as SutterTransformResult;
    const unmappedActions = sutterResult.unmappedActions
      ? sutterResult.unmappedActions
          .sort((a, b) => b.count - a.count)
          .slice(0, 20)
      : [];
    const unmappedActionsSummary = {
      totalTypes: unmappedActions.length,
      totalRows: unmappedActions.reduce((sum, a) => sum + a.count, 0)
    };

    // Step 7: Store in preview cache (include warnings, reassignments, sheetName, unmappedActions)
    const warnings = condensedReport.topWarnings.map(w => ({
      rowIndex: w.rowIndex,
      field: w.field,
      message: w.message,
      memberName: w.memberName
    }));
    const previewId = storePreview(
      systemId,
      mode,
      diffResult,
      transformResult.rows,
      validationResult,
      warnings,
      reassignments,
      targetOwnerId,
      undefined,
      parseResult.fileName
    );

    // Set sheetName and unmappedActions on the stored preview entry
    const previewEntry = getPreview(previewId)!;
    if (sheetName) {
      previewEntry.sheetName = sheetName;
    }
    if (unmappedActions.length > 0) {
      previewEntry.unmappedActions = unmappedActions.map(a => ({
        actionText: a.actionText,
        count: a.count
      }));
    }

    res.json({
      success: true,
      data: {
        previewId,
        systemId,
        mode,
        fileName: parseResult.fileName,
        sheetName: sheetName || undefined,
        expiresAt: previewEntry.expiresAt.toISOString(),
        targetOwnerId,
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
        // Reassignment warnings
        reassignments: {
          count: reassignments.length,
          requiresConfirmation: reassignments.length > 0,
          items: reassignments.slice(0, 20) // First 20 for preview
        },
        // Unmapped actions (Task 29)
        unmappedActions,
        unmappedActionsSummary,
        // Configurable preview columns metadata
        previewColumns: previewColumns.length > 0 ? previewColumns : undefined,
        // Preview of changes (first 50)
        changes: diffResult.changes.slice(0, 50).map(change => ({
          action: change.action,
          memberName: change.memberName,
          memberDob: change.memberDob,
          requestType: change.requestType,
          qualityMeasure: change.qualityMeasure,
          oldStatus: change.oldStatus,
          newStatus: change.newStatus,
          reason: change.reason,
          ...(change.extraData ? { extraColumns: change.extraData } : {})
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

    // Load previewColumns from system config for this preview
    const previewConfig = loadSystemConfig(entry.systemId);
    const pvColumns = previewConfig.previewColumns || [];

    res.json({
      success: true,
      data: {
        ...getPreviewSummary(entry),
        targetOwnerId: entry.targetOwnerId,
        patients: {
          new: entry.diff.newPatients,
          existing: entry.diff.existingPatients,
          total: entry.diff.newPatients + entry.diff.existingPatients
        },
        warnings: entry.warnings,
        // Reassignment info
        reassignments: {
          count: entry.reassignments.length,
          requiresConfirmation: entry.reassignments.length > 0,
          items: entry.reassignments
        },
        // Configurable preview columns metadata
        previewColumns: pvColumns.length > 0 ? pvColumns : undefined,
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
            reason: change.reason,
            ...(change.extraData ? { extraColumns: change.extraData } : {})
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
 *
 * Query params:
 * - confirmReassign: (required if reassignments exist) Set to 'true' to confirm patient reassignments
 */
router.post('/execute/:previewId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { previewId } = req.params;

    // Check if preview exists before executing
    const preview = getPreview(previewId);
    if (!preview) {
      return next(createError('Preview not found or expired', 404));
    }

    // Check for reassignments and require confirmation
    if (preview.reassignments.length > 0) {
      const confirmReassign = req.query.confirmReassign === 'true';
      if (!confirmReassign) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'REASSIGNMENT_REQUIRES_CONFIRMATION',
            message: `This import would reassign ${preview.reassignments.length} patient(s) from their current physician. Set confirmReassign=true to proceed.`,
          },
          data: {
            reassignments: preview.reassignments
          }
        });
      }
    }

    // Use the targetOwnerId from the preview (determined during preview creation)
    const ownerId = preview.targetOwnerId;

    // Emit import:started event via Socket.IO
    try {
      const room = getRoomName(ownerId ?? 'unassigned');
      broadcastToRoom(room, 'import:started', { importedBy: req.user!.displayName });
    } catch {
      // Socket.IO broadcast failure is non-fatal
    }

    // Execute the import with ownerId
    const result = await executeImport(previewId, ownerId);

    // Emit import:completed event via Socket.IO
    try {
      const room = getRoomName(ownerId ?? 'unassigned');
      broadcastToRoom(room, 'import:completed', {
        importedBy: req.user!.displayName,
        stats: {
          inserted: result.stats.inserted,
          updated: result.stats.updated,
          deleted: result.stats.deleted,
          skipped: result.stats.skipped,
          bothKept: result.stats.bothKept,
        },
      });
    } catch {
      // Socket.IO broadcast failure is non-fatal
    }

    res.json({
      success: result.success,
      data: {
        mode: result.mode,
        stats: result.stats,
        duration: result.duration,
        reassigned: preview.reassignments.length,
        errors: result.errors.length > 0 ? result.errors : undefined
      },
      message: result.success
        ? `Import completed: ${result.stats.inserted} inserted, ${result.stats.updated} updated, ${result.stats.deleted} deleted, ${result.stats.skipped} skipped, ${result.stats.bothKept} kept both${preview.reassignments.length > 0 ? `, ${preview.reassignments.length} reassigned` : ''}`
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
