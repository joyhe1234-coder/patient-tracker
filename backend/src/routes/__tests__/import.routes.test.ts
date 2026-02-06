/**
 * Import Routes Tests
 *
 * Tests for /api/import endpoints: authentication and authorization checks.
 * Note: Full integration testing of import functionality is done via E2E tests (Cypress),
 * as ESM module mocking with Jest has limitations for complex middleware chains.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockVerifyToken = jest.fn<any>();
const mockFindUserById = jest.fn<any>();
/* eslint-enable @typescript-eslint/no-explicit-any */

// Mock the database module
jest.mock('../../config/database.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
    },
    patientQualityMeasure: {
      findMany: jest.fn(),
    },
  },
}));

// Mock authService
jest.mock('../../services/authService.js', () => ({
  verifyToken: mockVerifyToken,
  findUserById: mockFindUserById,
  isStaffAssignedToPhysician: jest.fn(),
}));

// Mock config
jest.mock('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
  },
}));

// Mock configLoader
jest.mock('../../services/import/configLoader.js', () => ({
  listSystems: jest.fn().mockReturnValue([]),
  systemExists: jest.fn().mockReturnValue(false),
  loadSystemConfig: jest.fn(),
}));

// Mock fileParser
jest.mock('../../services/import/fileParser.js', () => ({
  parseFile: jest.fn(),
  validateRequiredColumns: jest.fn(),
}));

// Mock columnMapper
jest.mock('../../services/import/columnMapper.js', () => ({
  mapColumns: jest.fn(),
}));

// Mock dataTransformer
jest.mock('../../services/import/dataTransformer.js', () => ({
  transformData: jest.fn(),
  groupByPatient: jest.fn(),
}));

// Mock validator
jest.mock('../../services/import/validator.js', () => ({
  validateRows: jest.fn(),
}));

// Mock errorReporter
jest.mock('../../services/import/errorReporter.js', () => ({
  generateErrorReport: jest.fn(),
  getCondensedReport: jest.fn(),
}));

// Mock diffCalculator
jest.mock('../../services/import/diffCalculator.js', () => ({
  calculateDiff: jest.fn(),
  detectReassignments: jest.fn(),
  filterChangesByAction: jest.fn((changes) => changes),
  getModifyingChanges: jest.fn((changes) => changes),
}));

// Mock previewCache
jest.mock('../../services/import/previewCache.js', () => ({
  storePreview: jest.fn(),
  getPreview: jest.fn(),
  deletePreview: jest.fn(),
  getPreviewSummary: jest.fn(),
  getCacheStats: jest.fn(),
}));

// Mock importExecutor
jest.mock('../../services/import/importExecutor.js', () => ({
  executeImport: jest.fn(),
}));

// Mock upload middleware
jest.mock('../../middleware/upload.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleUpload: (req: any, _res: any, next: any) => {
    // Simulate multer setting req.file
    if (req.headers['x-test-file']) {
      req.file = {
        buffer: Buffer.from('test file content'),
        originalname: req.headers['x-test-file'],
      };
    }
    next();
  },
}));

import importRouter from '../import.routes.js';
import { errorHandler } from '../../middleware/errorHandler.js';

// Create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/import', importRouter);
  app.use(errorHandler);
  return app;
}

describe('import routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockVerifyToken.mockReturnValue(null);
  });

  describe('authentication requirements', () => {
    it('should return 401 for GET /systems when not authenticated', async () => {
      const response = await request(app)
        .get('/api/import/systems');

      expect(response.status).toBe(401);
    });

    it('should return 401 for GET /systems/:systemId when not authenticated', async () => {
      const response = await request(app)
        .get('/api/import/systems/hill');

      expect(response.status).toBe(401);
    });

    it('should return 401 for POST /parse when not authenticated', async () => {
      const response = await request(app)
        .post('/api/import/parse')
        .set('x-test-file', 'test.xlsx');

      expect(response.status).toBe(401);
    });

    it('should return 401 for POST /analyze when not authenticated', async () => {
      const response = await request(app)
        .post('/api/import/analyze')
        .set('x-test-file', 'test.xlsx');

      expect(response.status).toBe(401);
    });

    it('should return 401 for POST /transform when not authenticated', async () => {
      const response = await request(app)
        .post('/api/import/transform')
        .set('x-test-file', 'test.xlsx');

      expect(response.status).toBe(401);
    });

    it('should return 401 for POST /validate when not authenticated', async () => {
      const response = await request(app)
        .post('/api/import/validate')
        .set('x-test-file', 'test.xlsx');

      expect(response.status).toBe(401);
    });

    it('should return 401 for POST /preview when not authenticated', async () => {
      const response = await request(app)
        .post('/api/import/preview')
        .set('x-test-file', 'test.xlsx');

      expect(response.status).toBe(401);
    });

    it('should return 401 for GET /preview/:previewId when not authenticated', async () => {
      const response = await request(app)
        .get('/api/import/preview/test-preview-id');

      expect(response.status).toBe(401);
    });

    it('should return 401 for DELETE /preview/:previewId when not authenticated', async () => {
      const response = await request(app)
        .delete('/api/import/preview/test-preview-id');

      expect(response.status).toBe(401);
    });

    it('should return 401 for POST /execute/:previewId when not authenticated', async () => {
      const response = await request(app)
        .post('/api/import/execute/test-preview-id');

      expect(response.status).toBe(401);
    });

    it('should return 401 for GET /preview-cache/stats when not authenticated', async () => {
      const response = await request(app)
        .get('/api/import/preview-cache/stats');

      expect(response.status).toBe(401);
    });
  });

  // Note: Authorization and full functionality tests are covered by E2E Cypress tests
  // due to ESM module mocking limitations with middleware chains.
  //
  // The following scenarios should be tested via E2E:
  // - PHYSICIAN can access all import routes
  // - STAFF can access import routes and must specify physicianId for preview
  // - ADMIN without canHavePatients cannot access import routes (403)
  // - File upload parsing, transformation, and validation
  // - Preview generation with merge/replace modes
  // - Preview retrieval with pagination and filtering
  // - Import execution with/without reassignment confirmation
  // - Cache statistics
  //
  // See: frontend/cypress/e2e/import-*.cy.ts
});
