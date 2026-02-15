/**
 * Import Routes Tests
 *
 * Tests for /api/import endpoints: authentication + happy-path operations.
 *
 * Uses jest.unstable_mockModule + dynamic imports because ESM module
 * mocking with jest.mock() does not intercept transitive dependencies.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

const mockPrisma = {
  user: { findUnique: jest.fn<any>() },
  patient: { findMany: jest.fn<any>() },
};

const testUser = {
  id: 1,
  email: 'doc@example.com',
  displayName: 'Dr. Test',
  roles: ['PHYSICIAN'],
  isActive: true,
};

let authBlocked = false;

jest.unstable_mockModule('../../config/database.js', () => ({
  prisma: mockPrisma,
}));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    if (authBlocked) {
      const err: any = new Error('Authentication required');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }
    req.user = testUser;
    next();
  },
  requirePatientDataAccess: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../../middleware/socketIdMiddleware.js', () => ({
  socketIdMiddleware: (req: any, _res: any, next: any) => {
    req.socketId = 'test-socket-id';
    next();
  },
}));

jest.unstable_mockModule('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
  },
}));

// Mock configLoader
const mockListSystems = jest.fn<any>().mockReturnValue([
  { id: 'hill', name: 'Hill Healthcare' },
]);
const mockSystemExists = jest.fn<any>().mockReturnValue(true);
const mockLoadSystemConfig = jest.fn<any>().mockReturnValue({
  name: 'Hill Healthcare',
  version: '1.0',
  patientColumns: { Patient: {}, DOB: {} },
  measureColumns: { 'Annual Wellness Visit': { qualityMeasure: 'AWV' } },
  skipColumns: [],
});

jest.unstable_mockModule('../../services/import/configLoader.js', () => ({
  listSystems: mockListSystems,
  systemExists: mockSystemExists,
  loadSystemConfig: mockLoadSystemConfig,
  isHillConfig: (config: any) => config?.format !== 'long',
  isSutterConfig: (config: any) => config?.format === 'long',
}));

// Mock fileParser
const mockParseFile = jest.fn<any>().mockReturnValue({
  fileName: 'test.csv',
  fileType: 'csv',
  totalRows: 2,
  headers: ['Patient', 'DOB', 'Annual Wellness Visit Q2'],
  rows: [
    ['Smith, John', '01/15/1990', 'Compliant'],
    ['Doe, Jane', '05/20/1985', 'Non Compliant'],
  ],
  dataStartRow: 2,
});
const mockParseExcel = jest.fn<any>().mockReturnValue({
  fileName: 'test.xlsx',
  fileType: 'xlsx',
  totalRows: 2,
  headers: ['Member Name', 'Member DOB', 'Request Type', 'Possible Actions Needed'],
  rows: [
    { 'Member Name': 'Smith, John', 'Member DOB': '01/15/1990', 'Request Type': 'AWV', 'Possible Actions Needed': '' },
    { 'Member Name': 'Doe, Jane', 'Member DOB': '05/20/1985', 'Request Type': 'Quality', 'Possible Actions Needed': 'FOBT' },
  ],
  dataStartRow: 4,
});
const mockGetSheetNames = jest.fn<any>().mockReturnValue(['Dr. Smith', 'Dr. Jones', 'CAR Report']);
const mockValidateRequiredColumns = jest.fn<any>().mockReturnValue({ valid: true, missing: [] });

jest.unstable_mockModule('../../services/import/fileParser.js', () => ({
  parseFile: mockParseFile,
  parseExcel: mockParseExcel,
  getSheetNames: mockGetSheetNames,
  validateRequiredColumns: mockValidateRequiredColumns,
}));

// Mock columnMapper
jest.unstable_mockModule('../../services/import/columnMapper.js', () => ({
  mapColumns: jest.fn<any>().mockReturnValue({
    mappedColumns: [],
    unmappedColumns: [],
    missingRequired: [],
    stats: { mapped: 3, skipped: 0, unmapped: 0 },
  }),
}));

// Mock dataTransformer
jest.unstable_mockModule('../../services/import/dataTransformer.js', () => ({
  transformData: jest.fn<any>().mockReturnValue({
    rows: [
      { memberName: 'Smith, John', qualityMeasure: 'AWV', measureStatus: 'Compliant', sourceRowIndex: 0 },
      { memberName: 'Doe, Jane', qualityMeasure: 'AWV', measureStatus: 'Non Compliant', sourceRowIndex: 1 },
    ],
    stats: { inputRows: 2, outputRows: 2, patientsWithNoMeasures: 0 },
    errors: [],
    patientsWithNoMeasures: [],
    mapping: { stats: { mapped: 3, skipped: 0, unmapped: 0 }, unmappedColumns: [], missingRequired: [] },
    dataStartRow: 2,
  }),
  groupByPatient: jest.fn<any>().mockReturnValue(new Map([['Smith, John', []], ['Doe, Jane', []]])),
}));

// Mock validator
jest.unstable_mockModule('../../services/import/validator.js', () => ({
  validateRows: jest.fn<any>().mockReturnValue({
    valid: true,
    errors: [],
    warnings: [],
    duplicates: [],
    stats: { totalRows: 2, validRows: 2, errorCount: 0, warningCount: 0, duplicateGroups: 0 },
  }),
}));

// Mock errorReporter
jest.unstable_mockModule('../../services/import/errorReporter.js', () => ({
  generateErrorReport: jest.fn<any>().mockReturnValue({
    summary: { status: 'success', canProceed: true, errorCount: 0, warningCount: 0, message: 'OK' },
    errorsByField: {},
  }),
  getCondensedReport: jest.fn<any>().mockReturnValue({
    summary: { status: 'success', canProceed: true, errorCount: 0, warningCount: 0, message: 'OK' },
    topErrors: [],
    topWarnings: [],
    duplicates: [],
  }),
}));

// Mock diffCalculator
jest.unstable_mockModule('../../services/import/diffCalculator.js', () => ({
  calculateDiff: jest.fn<any>().mockResolvedValue({
    changes: [
      { action: 'INSERT', memberName: 'Smith, John', memberDob: '1990-01-15', requestType: 'AWV', qualityMeasure: 'AWV', oldStatus: null, newStatus: 'Compliant', reason: 'New' },
    ],
    summary: { inserts: 1, updates: 0, skips: 0, duplicates: 0, deletes: 0 },
    newPatients: 1,
    existingPatients: 0,
  }),
  detectReassignments: jest.fn<any>().mockResolvedValue([]),
  filterChangesByAction: jest.fn<any>().mockImplementation((changes: any) => changes),
  getModifyingChanges: jest.fn<any>().mockImplementation((changes: any) => changes),
}));

// Mock previewCache
const mockStorePreview = jest.fn<any>().mockReturnValue('preview-id-123');
const mockGetPreview = jest.fn<any>().mockReturnValue({
  diff: {
    changes: [{ action: 'INSERT', memberName: 'Smith', memberDob: '1990-01-15', requestType: 'AWV', qualityMeasure: 'AWV', oldStatus: null, newStatus: 'Compliant', reason: 'New' }],
    summary: { inserts: 1, updates: 0, skips: 0, duplicates: 0, deletes: 0 },
    newPatients: 1,
    existingPatients: 0,
  },
  warnings: [],
  reassignments: [],
  targetOwnerId: 1,
  expiresAt: new Date(Date.now() + 3600000),
});
const mockDeletePreview = jest.fn<any>().mockReturnValue(true);
const mockGetPreviewSummary = jest.fn<any>().mockReturnValue({
  previewId: 'preview-id-123',
  systemId: 'hill',
  mode: 'merge',
  summary: { inserts: 1, updates: 0, skips: 0, duplicates: 0, deletes: 0 },
});
const mockGetCacheStats = jest.fn<any>().mockReturnValue({ totalEntries: 1, totalSize: 1024 });

jest.unstable_mockModule('../../services/import/previewCache.js', () => ({
  storePreview: mockStorePreview,
  getPreview: mockGetPreview,
  deletePreview: mockDeletePreview,
  getPreviewSummary: mockGetPreviewSummary,
  getCacheStats: mockGetCacheStats,
}));

// Mock importExecutor
const mockExecuteImport = jest.fn<any>().mockResolvedValue({
  success: true,
  mode: 'merge',
  stats: { inserted: 1, updated: 0, deleted: 0, skipped: 0, bothKept: 0 },
  duration: 150,
  errors: [],
});

jest.unstable_mockModule('../../services/import/importExecutor.js', () => ({
  executeImport: mockExecuteImport,
}));

// Mock socketManager
jest.unstable_mockModule('../../services/socketManager.js', () => ({
  broadcastToRoom: jest.fn<any>(),
  getRoomName: jest.fn<any>().mockReturnValue('physician:1'),
}));

// Mock authService
jest.unstable_mockModule('../../services/authService.js', () => ({
  isStaffAssignedToPhysician: jest.fn<any>().mockResolvedValue(true),
  verifyToken: jest.fn<any>(),
  findUserById: jest.fn<any>(),
}));

// Mock upload middleware to simulate multer
// Parses x-test-file header as file, and x-test-* headers as body fields
jest.unstable_mockModule('../../middleware/upload.js', () => ({
  handleUpload: (req: any, _res: any, next: any) => {
    if (req.headers['x-test-file']) {
      req.file = {
        buffer: Buffer.from('Patient,DOB,AWV Q2\nSmith,1990-01-15,Compliant'),
        originalname: req.headers['x-test-file'],
      };
    }
    // Simulate multer parsing body fields from headers for testing
    if (req.headers['x-test-systemid']) {
      req.body = req.body || {};
      req.body.systemId = req.headers['x-test-systemid'];
    }
    if (req.headers['x-test-sheetname']) {
      req.body = req.body || {};
      req.body.sheetName = req.headers['x-test-sheetname'];
    }
    next();
  },
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { default: importRouter } = await import('../import.routes.js');
const { errorHandler } = await import('../../middleware/errorHandler.js');

// ── Helpers ────────────────────────────────────────────────────────

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/import', importRouter);
  app.use(errorHandler);
  return app;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('Import Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    authBlocked = false;
    app = createTestApp();
    // Re-set defaults after clearAllMocks
    mockListSystems.mockReturnValue([{ id: 'hill', name: 'Hill Healthcare' }]);
    mockSystemExists.mockReturnValue(true);
    mockLoadSystemConfig.mockReturnValue({
      name: 'Hill Healthcare',
      version: '1.0',
      patientColumns: { Patient: {}, DOB: {} },
      measureColumns: { 'Annual Wellness Visit': { qualityMeasure: 'AWV' } },
      skipColumns: [],
    });
    mockParseFile.mockReturnValue({
      fileName: 'test.csv',
      fileType: 'csv',
      totalRows: 2,
      headers: ['Patient', 'DOB', 'Annual Wellness Visit Q2'],
      rows: [
        ['Smith, John', '01/15/1990', 'Compliant'],
        ['Doe, Jane', '05/20/1985', 'Non Compliant'],
      ],
      dataStartRow: 2,
    });
    mockParseExcel.mockReturnValue({
      fileName: 'test.xlsx',
      fileType: 'xlsx',
      totalRows: 2,
      headers: ['Member Name', 'Member DOB', 'Request Type', 'Possible Actions Needed'],
      rows: [
        { 'Member Name': 'Smith, John', 'Member DOB': '01/15/1990', 'Request Type': 'AWV', 'Possible Actions Needed': '' },
        { 'Member Name': 'Doe, Jane', 'Member DOB': '05/20/1985', 'Request Type': 'Quality', 'Possible Actions Needed': 'FOBT' },
      ],
      dataStartRow: 4,
    });
    mockGetSheetNames.mockReturnValue(['Dr. Smith', 'Dr. Jones', 'CAR Report']);
    mockGetPreview.mockReturnValue({
      diff: {
        changes: [{ action: 'INSERT', memberName: 'Smith', memberDob: '1990-01-15', requestType: 'AWV', qualityMeasure: 'AWV', oldStatus: null, newStatus: 'Compliant', reason: 'New' }],
        summary: { inserts: 1, updates: 0, skips: 0, duplicates: 0, deletes: 0 },
        newPatients: 1,
        existingPatients: 0,
      },
      warnings: [],
      reassignments: [],
      targetOwnerId: 1,
      expiresAt: new Date(Date.now() + 3600000),
    });
    mockStorePreview.mockReturnValue('preview-id-123');
    mockDeletePreview.mockReturnValue(true);
    mockGetCacheStats.mockReturnValue({ totalEntries: 1, totalSize: 1024 });
    mockExecuteImport.mockResolvedValue({
      success: true,
      mode: 'merge',
      stats: { inserted: 1, updated: 0, deleted: 0, skipped: 0, bothKept: 0 },
      duration: 150,
      errors: [],
    });
  });

  // ── Authentication ──────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 for GET /systems when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).get('/api/import/systems');
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST /parse when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).post('/api/import/parse').set('x-test-file', 'test.csv');
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST /preview when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).post('/api/import/preview').set('x-test-file', 'test.csv');
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST /execute when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).post('/api/import/execute/preview-id');
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST /sheets when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).post('/api/import/sheets').set('x-test-file', 'test.xlsx');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/import/systems ─────────────────────────────────────

  describe('GET /api/import/systems', () => {
    it('returns available systems', async () => {
      const res = await request(app).get('/api/import/systems');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('hill');
    });
  });

  // ── GET /api/import/systems/:systemId ───────────────────────────

  describe('GET /api/import/systems/:systemId', () => {
    it('returns system configuration', async () => {
      const res = await request(app).get('/api/import/systems/hill');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('hill');
      expect(res.body.data.name).toBe('Hill Healthcare');
    });

    it('returns 404 for non-existent system', async () => {
      mockSystemExists.mockReturnValue(false);

      const res = await request(app).get('/api/import/systems/unknown');

      expect(res.status).toBe(404);
    });

    it('returns safe values for Sutter config (Task 30)', async () => {
      mockLoadSystemConfig.mockReturnValue({
        name: 'Sutter/SIP',
        version: '1.0',
        format: 'long',
        headerRow: 3,
        patientColumns: { 'Member Name': 'memberName', 'Member DOB': 'memberDob' },
        skipTabs: [],
      });

      const res = await request(app).get('/api/import/systems/sutter');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Sutter/SIP');
      expect(res.body.data.measureColumns).toEqual([]);
      expect(res.body.data.qualityMeasures).toEqual([]);
      expect(res.body.data.skipColumns).toEqual([]);
    });
  });

  // ── POST /api/import/parse ──────────────────────────────────────

  describe('POST /api/import/parse', () => {
    it('parses uploaded file', async () => {
      const res = await request(app)
        .post('/api/import/parse')
        .set('x-test-file', 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileName).toBe('test.csv');
      expect(res.body.data.totalRows).toBe(2);
    });

    it('returns 400 when no file uploaded', async () => {
      const res = await request(app).post('/api/import/parse');

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/import/analyze ────────────────────────────────────

  describe('POST /api/import/analyze', () => {
    it('analyzes column mappings', async () => {
      const res = await request(app)
        .post('/api/import/analyze')
        .set('x-test-file', 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mapping).toBeDefined();
    });
  });

  // ── POST /api/import/transform ──────────────────────────────────

  describe('POST /api/import/transform', () => {
    it('transforms file data', async () => {
      const res = await request(app)
        .post('/api/import/transform')
        .set('x-test-file', 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toBeDefined();
    });
  });

  // ── POST /api/import/validate ───────────────────────────────────

  describe('POST /api/import/validate', () => {
    it('validates transformed data', async () => {
      const res = await request(app)
        .post('/api/import/validate')
        .set('x-test-file', 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.validation).toBeDefined();
      expect(res.body.data.validation.valid).toBe(true);
    });
  });

  // ── POST /api/import/preview ────────────────────────────────────

  describe('POST /api/import/preview', () => {
    it('generates diff preview', async () => {
      const res = await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.previewId).toBe('preview-id-123');
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.inserts).toBe(1);
    });
  });

  // ── POST /api/import/sheets (Task 31) ──────────────────────────

  describe('POST /api/import/sheets', () => {
    it('returns sheet names from a multi-sheet Excel file', async () => {
      mockGetSheetNames.mockReturnValue(['Dr. Smith', 'Dr. Jones', 'CAR Report']);
      mockLoadSystemConfig.mockReturnValue({
        name: 'Sutter/SIP',
        version: '1.0',
        format: 'long',
        headerRow: 3,
        patientColumns: { 'Member Name': 'memberName' },
        skipTabs: [],
      });

      const res = await request(app)
        .post('/api/import/sheets')
        .set('x-test-file', 'test.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sheets).toEqual(['Dr. Smith', 'Dr. Jones', 'CAR Report']);
      expect(res.body.data.totalSheets).toBe(3);
      expect(res.body.data.filteredSheets).toBe(3);
    });

    it('filters tabs using skipTabs patterns', async () => {
      mockGetSheetNames.mockReturnValue(['Dr. Smith', 'Dr. Jones', 'Dr. Smith_NY', 'CAR Report', 'Perf by Measure Q1']);
      mockLoadSystemConfig.mockReturnValue({
        name: 'Sutter/SIP',
        version: '1.0',
        format: 'long',
        headerRow: 3,
        patientColumns: { 'Member Name': 'memberName' },
        skipTabs: [
          { type: 'suffix', value: '_NY' },
          { type: 'exact', value: 'CAR Report' },
          { type: 'prefix', value: 'Perf by Measure' },
        ],
      });

      const res = await request(app)
        .post('/api/import/sheets')
        .set('x-test-file', 'test.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.data.sheets).toEqual(['Dr. Smith', 'Dr. Jones']);
      expect(res.body.data.totalSheets).toBe(5);
      expect(res.body.data.filteredSheets).toBe(2);
      expect(res.body.data.skippedSheets).toEqual(['Dr. Smith_NY', 'CAR Report', 'Perf by Measure Q1']);
    });

    it('returns 400 when no valid tabs remain after filtering', async () => {
      mockGetSheetNames.mockReturnValue(['CAR Report']);
      mockLoadSystemConfig.mockReturnValue({
        name: 'Sutter/SIP',
        version: '1.0',
        format: 'long',
        headerRow: 3,
        patientColumns: { 'Member Name': 'memberName' },
        skipTabs: [
          { type: 'exact', value: 'CAR Report' },
        ],
      });

      const res = await request(app)
        .post('/api/import/sheets')
        .set('x-test-file', 'test.xlsx');

      expect(res.status).toBe(400);
    });

    it('returns 400 when no file is uploaded', async () => {
      const res = await request(app).post('/api/import/sheets');

      expect(res.status).toBe(400);
    });

    it('returns 404 when system does not exist', async () => {
      mockSystemExists.mockReturnValue(false);

      const res = await request(app)
        .post('/api/import/sheets')
        .set('x-test-file', 'test.xlsx')
        .set('x-test-systemid', 'nonexistent');

      expect(res.status).toBe(404);
    });

    it('does not filter tabs for Hill (no skipTabs)', async () => {
      mockGetSheetNames.mockReturnValue(['Sheet1']);
      mockLoadSystemConfig.mockReturnValue({
        name: 'Hill Healthcare',
        version: '1.0',
        patientColumns: { Patient: {} },
        measureColumns: {},
        skipColumns: [],
      });

      const res = await request(app)
        .post('/api/import/sheets')
        .set('x-test-file', 'test.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.data.sheets).toEqual(['Sheet1']);
      expect(res.body.data.totalSheets).toBe(1);
      expect(res.body.data.filteredSheets).toBe(1);
      expect(res.body.data.skippedSheets).toEqual([]);
    });

    it('handles suffix skipTabs pattern', async () => {
      mockGetSheetNames.mockReturnValue(['Dr. Smith', 'Dr. Smith_NY', 'Report Perf by Measure']);
      mockLoadSystemConfig.mockReturnValue({
        name: 'Sutter/SIP',
        version: '1.0',
        format: 'long',
        headerRow: 3,
        patientColumns: { 'Member Name': 'memberName' },
        skipTabs: [
          { type: 'suffix', value: '_NY' },
          { type: 'suffix', value: 'Perf by Measure' },
        ],
      });

      const res = await request(app)
        .post('/api/import/sheets')
        .set('x-test-file', 'test.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.data.sheets).toEqual(['Dr. Smith']);
      expect(res.body.data.skippedSheets).toEqual(['Dr. Smith_NY', 'Report Perf by Measure']);
    });

    it('handles contains skipTabs pattern', async () => {
      mockGetSheetNames.mockReturnValue(['Dr. Smith', 'Internal CAR Data', 'Summary']);
      mockLoadSystemConfig.mockReturnValue({
        name: 'Sutter/SIP',
        version: '1.0',
        format: 'long',
        headerRow: 3,
        patientColumns: { 'Member Name': 'memberName' },
        skipTabs: [
          { type: 'contains', value: 'CAR' },
        ],
      });

      const res = await request(app)
        .post('/api/import/sheets')
        .set('x-test-file', 'test.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.data.sheets).toEqual(['Dr. Smith', 'Summary']);
    });

    it('calls getSheetNames with the file buffer', async () => {
      mockGetSheetNames.mockReturnValue(['Sheet1']);

      await request(app)
        .post('/api/import/sheets')
        .set('x-test-file', 'test.xlsx');

      expect(mockGetSheetNames).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('uses default systemId (hill) when not provided', async () => {
      mockGetSheetNames.mockReturnValue(['Sheet1']);

      const res = await request(app)
        .post('/api/import/sheets')
        .set('x-test-file', 'test.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.data.sheets).toEqual(['Sheet1']);
    });
  });

  // ── POST /api/import/preview with sheetName (Task 32) ─────────

  describe('POST /api/import/preview (sheetName + unmappedActions)', () => {
    const sutterConfig = {
      name: 'Sutter/SIP',
      version: '1.0',
      format: 'long',
      headerRow: 3,
      patientColumns: { 'Member Name': 'memberName', 'Member DOB': 'memberDob' },
      skipTabs: [],
      actionMapping: [],
      skipActions: [],
    };

    it('succeeds with valid sheetName for Sutter', async () => {
      mockLoadSystemConfig.mockReturnValue(sutterConfig);
      mockGetSheetNames.mockReturnValue(['Dr. Smith', 'Dr. Jones']);

      const res = await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.xlsx')
        .set('x-test-systemid', 'sutter')
        .set('x-test-sheetname', 'Dr. Smith');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.previewId).toBe('preview-id-123');
      expect(res.body.data.sheetName).toBe('Dr. Smith');
    });

    it('returns 400 when sheetName is missing for Sutter', async () => {
      mockLoadSystemConfig.mockReturnValue(sutterConfig);

      const res = await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.xlsx')
        .set('x-test-systemid', 'sutter');

      expect(res.status).toBe(400);
    });

    it('returns 400 when sheetName does not exist in workbook', async () => {
      mockLoadSystemConfig.mockReturnValue(sutterConfig);
      mockGetSheetNames.mockReturnValue(['Dr. Smith', 'Dr. Jones']);

      const res = await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.xlsx')
        .set('x-test-systemid', 'sutter')
        .set('x-test-sheetname', 'NonExistent Sheet');

      expect(res.status).toBe(400);
    });

    it('ignores sheetName for Hill imports (backwards compatibility)', async () => {
      mockLoadSystemConfig.mockReturnValue({
        name: 'Hill Healthcare',
        version: '1.0',
        patientColumns: { Patient: {}, DOB: {} },
        measureColumns: { 'Annual Wellness Visit': { qualityMeasure: 'AWV' } },
        skipColumns: [],
      });
      // Hill sheets validation: if sheetName provided, it must exist in workbook
      mockGetSheetNames.mockReturnValue(['SomeSheet']);

      const res = await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.csv')
        .set('x-test-sheetname', 'SomeSheet');

      // Hill does not require sheetName and uses parseFile (not parseExcel)
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // parseFile is called (not parseExcel) because config is not Sutter
      expect(mockParseFile).toHaveBeenCalled();
      expect(mockParseExcel).not.toHaveBeenCalled();
    });

    it('calls parseExcel with sheetName and headerRow for Sutter', async () => {
      mockLoadSystemConfig.mockReturnValue(sutterConfig);
      mockGetSheetNames.mockReturnValue(['Dr. Smith']);

      await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.xlsx')
        .set('x-test-systemid', 'sutter')
        .set('x-test-sheetname', 'Dr. Smith');

      expect(mockParseExcel).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test.xlsx',
        { sheetName: 'Dr. Smith', headerRow: 3 }
      );
    });

    it('includes unmappedActions in preview response when present', async () => {
      mockLoadSystemConfig.mockReturnValue(sutterConfig);
      mockGetSheetNames.mockReturnValue(['Dr. Smith']);

      // Mock transformData to return SutterTransformResult with unmappedActions
      const { transformData } = await import('../../services/import/dataTransformer.js');
      (transformData as any).mockReturnValue({
        rows: [
          { memberName: 'Smith, John', qualityMeasure: 'AWV', measureStatus: 'Compliant', sourceRowIndex: 0 },
        ],
        stats: { inputRows: 5, outputRows: 1, patientsWithNoMeasures: 0 },
        errors: [],
        patientsWithNoMeasures: [],
        mapping: { stats: { mapped: 3, skipped: 0, unmapped: 0 }, unmappedColumns: [], missingRequired: [] },
        dataStartRow: 4,
        unmappedActions: [
          { actionText: 'Well-Child Visit (15-30 mos)', count: 5 },
          { actionText: 'Unknown Action X', count: 2 },
        ],
      });

      const res = await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.xlsx')
        .set('x-test-systemid', 'sutter')
        .set('x-test-sheetname', 'Dr. Smith');

      expect(res.status).toBe(200);
      expect(res.body.data.unmappedActions).toHaveLength(2);
      expect(res.body.data.unmappedActions[0].actionText).toBe('Well-Child Visit (15-30 mos)');
      expect(res.body.data.unmappedActions[0].count).toBe(5);
      expect(res.body.data.unmappedActionsSummary.totalTypes).toBe(2);
      expect(res.body.data.unmappedActionsSummary.totalRows).toBe(7);
    });

    it('returns empty unmappedActions when all actions are mapped', async () => {
      // Reset transformData mock to default (no unmappedActions)
      const { transformData } = await import('../../services/import/dataTransformer.js');
      (transformData as any).mockReturnValue({
        rows: [
          { memberName: 'Smith, John', qualityMeasure: 'AWV', measureStatus: 'Compliant', sourceRowIndex: 0 },
        ],
        stats: { inputRows: 2, outputRows: 1, patientsWithNoMeasures: 0 },
        errors: [],
        patientsWithNoMeasures: [],
        mapping: { stats: { mapped: 3, skipped: 0, unmapped: 0 }, unmappedColumns: [], missingRequired: [] },
        dataStartRow: 2,
        // No unmappedActions (Hill-style result)
      });

      const res = await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.csv');

      expect(res.status).toBe(200);
      expect(res.body.data.unmappedActions).toEqual([]);
      expect(res.body.data.unmappedActionsSummary.totalTypes).toBe(0);
      expect(res.body.data.unmappedActionsSummary.totalRows).toBe(0);
    });

    it('limits unmappedActions to first 20 entries sorted by count', async () => {
      mockLoadSystemConfig.mockReturnValue(sutterConfig);
      mockGetSheetNames.mockReturnValue(['Dr. Smith']);

      // Create 25 unmapped actions
      const manyActions = Array.from({ length: 25 }, (_, i) => ({
        actionText: `Action ${i}`,
        count: 25 - i,
      }));

      const { transformData } = await import('../../services/import/dataTransformer.js');
      (transformData as any).mockReturnValue({
        rows: [
          { memberName: 'Smith, John', qualityMeasure: 'AWV', measureStatus: 'Compliant', sourceRowIndex: 0 },
        ],
        stats: { inputRows: 100, outputRows: 1, patientsWithNoMeasures: 0 },
        errors: [],
        patientsWithNoMeasures: [],
        mapping: { stats: { mapped: 3, skipped: 0, unmapped: 0 }, unmappedColumns: [], missingRequired: [] },
        dataStartRow: 4,
        unmappedActions: manyActions,
      });

      const res = await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.xlsx')
        .set('x-test-systemid', 'sutter')
        .set('x-test-sheetname', 'Dr. Smith');

      expect(res.status).toBe(200);
      expect(res.body.data.unmappedActions).toHaveLength(20);
      // First entry should have the highest count
      expect(res.body.data.unmappedActions[0].count).toBe(25);
    });

    it('returns 400 when selected tab has no data rows', async () => {
      mockLoadSystemConfig.mockReturnValue(sutterConfig);
      mockGetSheetNames.mockReturnValue(['Dr. Smith']);
      mockParseExcel.mockReturnValue({
        fileName: 'test.xlsx',
        fileType: 'xlsx',
        totalRows: 0,
        headers: ['Member Name', 'Member DOB'],
        rows: [],
        dataStartRow: 4,
      });

      const res = await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.xlsx')
        .set('x-test-systemid', 'sutter')
        .set('x-test-sheetname', 'Dr. Smith');

      expect(res.status).toBe(400);
    });

    it('stores sheetName in preview cache entry', async () => {
      mockLoadSystemConfig.mockReturnValue(sutterConfig);
      mockGetSheetNames.mockReturnValue(['Dr. Smith']);

      // Mock getPreview to return an object we can inspect mutations on
      const previewEntry = {
        diff: {
          changes: [{ action: 'INSERT', memberName: 'Smith', memberDob: '1990-01-15', requestType: 'AWV', qualityMeasure: 'AWV', oldStatus: null, newStatus: 'Compliant', reason: 'New' }],
          summary: { inserts: 1, updates: 0, skips: 0, duplicates: 0, deletes: 0 },
          newPatients: 1,
          existingPatients: 0,
        },
        warnings: [],
        reassignments: [],
        targetOwnerId: 1,
        expiresAt: new Date(Date.now() + 3600000),
      } as any;
      mockGetPreview.mockReturnValue(previewEntry);

      await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.xlsx')
        .set('x-test-systemid', 'sutter')
        .set('x-test-sheetname', 'Dr. Smith');

      // The route sets sheetName on the preview entry after storePreview
      expect(previewEntry.sheetName).toBe('Dr. Smith');
    });
  });

  // ── GET /api/import/preview/:previewId ──────────────────────────

  describe('GET /api/import/preview/:previewId', () => {
    it('returns stored preview', async () => {
      const res = await request(app).get('/api/import/preview/preview-id-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.changes).toBeDefined();
    });

    it('returns 404 for expired/missing preview', async () => {
      mockGetPreview.mockReturnValue(null);

      const res = await request(app).get('/api/import/preview/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/import/preview/:previewId ───────────────────────

  describe('DELETE /api/import/preview/:previewId', () => {
    it('deletes a preview', async () => {
      const res = await request(app).delete('/api/import/preview/preview-id-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 for missing preview', async () => {
      mockDeletePreview.mockReturnValue(false);

      const res = await request(app).delete('/api/import/preview/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/import/execute/:previewId ─────────────────────────

  describe('POST /api/import/execute/:previewId', () => {
    it('executes an import', async () => {
      const res = await request(app).post('/api/import/execute/preview-id-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats.inserted).toBe(1);
      expect(res.body.message).toContain('Import completed');
    });

    it('returns 404 for missing preview', async () => {
      mockGetPreview.mockReturnValue(null);

      const res = await request(app).post('/api/import/execute/nonexistent');

      expect(res.status).toBe(404);
    });

    it('requires confirmation for reassignments', async () => {
      mockGetPreview.mockReturnValue({
        diff: {
          changes: [],
          summary: { inserts: 0, updates: 0, skips: 0, duplicates: 0, deletes: 0 },
          newPatients: 0,
          existingPatients: 0,
        },
        warnings: [],
        reassignments: [{ patientName: 'Smith', currentOwnerId: 2, newOwnerId: 1 }],
        targetOwnerId: 1,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const res = await request(app).post('/api/import/execute/preview-id-123');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('REASSIGNMENT_REQUIRES_CONFIRMATION');
    });

    it('proceeds with reassignment when confirmReassign=true', async () => {
      mockGetPreview.mockReturnValue({
        diff: {
          changes: [],
          summary: { inserts: 0, updates: 0, skips: 0, duplicates: 0, deletes: 0 },
          newPatients: 0,
          existingPatients: 0,
        },
        warnings: [],
        reassignments: [{ patientName: 'Smith', currentOwnerId: 2, newOwnerId: 1 }],
        targetOwnerId: 1,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const res = await request(app)
        .post('/api/import/execute/preview-id-123?confirmReassign=true');

      expect(res.status).toBe(200);
    });
  });

  // ── GET /api/import/preview-cache/stats ─────────────────────────

  describe('GET /api/import/preview-cache/stats', () => {
    it('returns cache statistics', async () => {
      const res = await request(app).get('/api/import/preview-cache/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalEntries).toBe(1);
    });
  });
});
