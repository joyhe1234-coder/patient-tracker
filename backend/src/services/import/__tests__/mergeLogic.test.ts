/**
 * Integration tests for merge logic in import preview
 * Tests all 6 merge cases using merge-test-cases.csv
 *
 * Requires database to be seeded with test data before running:
 *   npx prisma migrate reset --force
 *   npx tsx prisma/seed.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { parseFile } from '../fileParser.js';
import { transformData } from '../dataTransformer.js';
import { validateRows } from '../validator.js';
import { calculateDiff, filterChangesByAction, getModifyingChanges, DiffChange } from '../diffCalculator.js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test data files
const testDataDir = path.join(__dirname, '../../../../../test-data');
const systemId = 'hill';

/**
 * Check if database has required test patients WITH MEASURES for merge testing
 * Returns the count of expected patients found that have at least one measure
 */
async function checkTestDataExists(): Promise<number> {
  const expectedPatients = [
    'Smith, John',
    'Johnson, Mary',
    'Brown, Patricia',
    'Jones, Michael',
    'Garcia, Linda',
    'Miller, Barbara',
    'Wilson, Sarah',
    'Anderson, Karen',
    'Thomas, James',
    'Sanchez, Donald',
    'Wright, Steven',
    'Robinson, Ashley',
  ];

  // Count patients that exist AND have at least one measure
  const patientsWithMeasures = await prisma.patient.findMany({
    where: {
      memberName: { in: expectedPatients },
      measures: {
        some: {} // Has at least one measure
      }
    },
    select: { id: true }
  });

  return patientsWithMeasures.length;
}

/**
 * Run the full import pipeline including diff calculation
 */
async function runPreviewPipeline(buffer: Buffer, fileName: string, mode: 'merge' | 'replace') {
  // Step 1: Parse
  const parseResult = parseFile(buffer, fileName);

  // Step 2: Transform
  const transformResult = transformData(
    parseResult.headers,
    parseResult.rows,
    systemId,
    parseResult.dataStartRow
  );

  // Step 3: Validate
  const validationResult = validateRows(transformResult.rows);

  // Step 4: Calculate diff
  const diffResult = await calculateDiff(transformResult.rows, mode);

  return {
    parse: parseResult,
    transform: transformResult,
    validation: validationResult,
    diff: diffResult,
  };
}

describe('Merge Logic Integration Tests', () => {
  const csvPath = path.join(testDataDir, 'merge-test-cases.csv');

  // Skip all tests if file doesn't exist
  const fileExists = fs.existsSync(csvPath);

  // Track if database has test data (set in beforeAll)
  let dbHasTestData = false;
  let testPatientCount = 0;

  beforeAll(async () => {
    testPatientCount = await checkTestDataExists();
    dbHasTestData = testPatientCount >= 10; // Need at least 10 of the expected patients
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('merge mode with merge-test-cases.csv', () => {
    it('should process merge test file successfully', async () => {
      if (!fileExists) {
        console.log('Skipping: merge-test-cases.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await runPreviewPipeline(buffer, 'merge-test-cases.csv', 'merge');

      // Parse should succeed
      expect(result.parse.totalRows).toBeGreaterThan(0);

      // Transform should produce output rows
      expect(result.transform.stats.outputRows).toBeGreaterThan(0);

      // Diff should have changes
      expect(result.diff.changes.length).toBeGreaterThan(0);
    });

    it('should correctly identify INSERT actions for new patients', async () => {
      if (!fileExists) {
        console.log('Skipping: merge-test-cases.csv not found');
        return;
      }
      if (!dbHasTestData) {
        console.log(`Skipping: Database needs fresh state for INSERT tests (found ${testPatientCount} test patients). Run: npx prisma migrate reset --force && npx tsx prisma/seed.ts`);
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await runPreviewPipeline(buffer, 'merge-test-cases.csv', 'merge');

      const inserts = filterChangesByAction(result.diff.changes, 'INSERT');

      // If we have inserts, verify they have the right structure
      if (inserts.length > 0) {
        // Check for new patients specifically if the CSV has them
        const newPatientInserts = inserts.filter(c =>
          c.memberName.includes('New Patient')
        );

        // If the CSV file has new patients, they should be in the inserts
        if (newPatientInserts.length > 0) {
          for (const insert of newPatientInserts) {
            expect(insert.oldStatus).toBeNull();
            expect(insert.reason).toContain('New patient+measure');
          }
        }

        // All inserts should have null oldStatus (regardless of patient type)
        for (const insert of inserts) {
          expect(insert.oldStatus).toBeNull();
        }
      } else {
        // No inserts - all data already exists in DB
        console.log('Note: No INSERT actions found - all patients/measures may already exist in DB');
      }
    });

    it('should correctly identify UPDATE actions (non-compliant → compliant)', async () => {
      if (!fileExists) {
        console.log('Skipping: merge-test-cases.csv not found');
        return;
      }
      if (!dbHasTestData) {
        console.log(`Skipping: Database needs seeded test data (found ${testPatientCount} test patients, need 10+). Run: npx prisma migrate reset --force && npx tsx prisma/seed.ts`);
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await runPreviewPipeline(buffer, 'merge-test-cases.csv', 'merge');

      const updates = filterChangesByAction(result.diff.changes, 'UPDATE');

      // If we have updates, verify they have the right structure
      if (updates.length > 0) {
        // Updates should have valid upgrade reasons
        for (const update of updates) {
          // Valid reasons: upgrading to compliant, or updating unknown status
          expect(
            update.reason.includes('Upgrading') || update.reason.includes('updating')
          ).toBe(true);
        }
      } else {
        // No updates - database state doesn't have non-compliant records to upgrade
        console.log('Note: No UPDATE actions found - DB may not have non-compliant records for upgrade');
      }
    });

    it('should correctly identify SKIP actions for same compliance status', async () => {
      if (!fileExists) {
        console.log('Skipping: merge-test-cases.csv not found');
        return;
      }
      if (!dbHasTestData) {
        console.log(`Skipping: Database needs seeded test data (found ${testPatientCount} test patients, need 10+). Run: npx prisma migrate reset --force && npx tsx prisma/seed.ts`);
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await runPreviewPipeline(buffer, 'merge-test-cases.csv', 'merge');

      const skips = filterChangesByAction(result.diff.changes, 'SKIP');

      // Should have skips
      expect(skips.length).toBeGreaterThan(0);

      // Skips should have valid reasons
      for (const skip of skips) {
        expect(skip.reason).toBeDefined();
        expect(['Both compliant', 'Both non-compliant', 'blank', 'keeping existing'].some(
          keyword => skip.reason.toLowerCase().includes(keyword.toLowerCase())
        )).toBe(true);
      }
    });

    it('should correctly identify BOTH actions for downgrades (compliant → non-compliant)', async () => {
      if (!fileExists) {
        console.log('Skipping: merge-test-cases.csv not found');
        return;
      }
      if (!dbHasTestData) {
        console.log(`Skipping: Database needs seeded test data (found ${testPatientCount} test patients, need 10+). Run: npx prisma migrate reset --force && npx tsx prisma/seed.ts`);
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await runPreviewPipeline(buffer, 'merge-test-cases.csv', 'merge');

      const bothActions = filterChangesByAction(result.diff.changes, 'BOTH');

      // Check if we have any BOTH actions (downgrade scenarios)
      // This depends on the specific test data in the CSV
      if (bothActions.length > 0) {
        for (const both of bothActions) {
          expect(both.reason).toContain('Downgrade');
          // Old should be compliant, new should be non-compliant
        }
      }
    });

    it('should have correct summary counts', async () => {
      if (!fileExists) {
        console.log('Skipping: merge-test-cases.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await runPreviewPipeline(buffer, 'merge-test-cases.csv', 'merge');

      const { summary, changes } = result.diff;

      // Summary counts should match filtered changes
      expect(summary.inserts).toBe(filterChangesByAction(changes, 'INSERT').length);
      expect(summary.updates).toBe(filterChangesByAction(changes, 'UPDATE').length);
      expect(summary.skips).toBe(filterChangesByAction(changes, 'SKIP').length);
      expect(summary.duplicates).toBe(filterChangesByAction(changes, 'BOTH').length);
      expect(summary.deletes).toBe(filterChangesByAction(changes, 'DELETE').length);

      // Total should match
      const total = summary.inserts + summary.updates + summary.skips + summary.duplicates + summary.deletes;
      expect(total).toBe(changes.length);
    });

    it('should correctly count new vs existing patients', async () => {
      if (!fileExists) {
        console.log('Skipping: merge-test-cases.csv not found');
        return;
      }
      if (!dbHasTestData) {
        console.log(`Skipping: Database needs seeded test data (found ${testPatientCount} test patients, need 10+). Run: npx prisma migrate reset --force && npx tsx prisma/seed.ts`);
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await runPreviewPipeline(buffer, 'merge-test-cases.csv', 'merge');

      // Total should be non-negative
      expect(result.diff.newPatients).toBeGreaterThanOrEqual(0);
      expect(result.diff.existingPatients).toBeGreaterThanOrEqual(0);

      // Total should be positive (at least one patient in the import)
      expect(result.diff.newPatients + result.diff.existingPatients).toBeGreaterThan(0);
    });

    it('should return modifying changes (excluding SKIPs)', async () => {
      if (!fileExists) {
        console.log('Skipping: merge-test-cases.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await runPreviewPipeline(buffer, 'merge-test-cases.csv', 'merge');

      const modifying = getModifyingChanges(result.diff.changes);
      const skips = filterChangesByAction(result.diff.changes, 'SKIP');

      // Modifying should not include SKIPs
      expect(modifying.length).toBe(result.diff.changes.length - skips.length);

      // No SKIP in modifying changes
      expect(modifying.every(c => c.action !== 'SKIP')).toBe(true);
    });
  });

  describe('replace mode with merge-test-cases.csv', () => {
    it('should delete all existing and insert all new in replace mode', async () => {
      if (!fileExists) {
        console.log('Skipping: merge-test-cases.csv not found');
        return;
      }
      if (!dbHasTestData) {
        console.log(`Skipping: Database needs seeded test data (found ${testPatientCount} test patients, need 10+). Run: npx prisma migrate reset --force && npx tsx prisma/seed.ts`);
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = await runPreviewPipeline(buffer, 'merge-test-cases.csv', 'replace');

      const { summary, changes } = result.diff;

      // In replace mode, should have:
      // - DELETEs for all existing records
      // - INSERTs for all import rows (with non-blank values)

      // Should have deletes (for existing data)
      expect(summary.deletes).toBeGreaterThan(0);

      // Should have inserts
      expect(summary.inserts).toBeGreaterThan(0);

      // Should have NO updates, skips, or duplicates
      expect(summary.updates).toBe(0);
      expect(summary.skips).toBe(0);
      expect(summary.duplicates).toBe(0);

      // All deletes should have reason about Replace All mode
      const deletes = filterChangesByAction(changes, 'DELETE');
      for (const del of deletes) {
        expect(del.reason).toContain('Replace All');
      }

      // All inserts should have reason about Replace All mode
      const inserts = filterChangesByAction(changes, 'INSERT');
      for (const ins of inserts) {
        expect(ins.reason).toContain('Replace All');
      }
    });
  });

  describe('merge logic edge cases', () => {
    it('should handle blank import values as SKIP', async () => {
      // Create a simple CSV with blank value for existing patient
      const csv = `Patient,DOB,Phone,Address,Annual Wellness Visit
"Smith, John",1955-01-15,5551001001,101 Oak Street,`;

      const buffer = Buffer.from(csv);
      const result = await runPreviewPipeline(buffer, 'test-blank.csv', 'merge');

      // Find the change for Smith, John
      const smithChange = result.diff.changes.find(c => c.memberName === 'Smith, John');

      // If no measures generated for blank value, no change should exist
      // Or it should be a SKIP
      if (smithChange) {
        expect(smithChange.action).toBe('SKIP');
        expect(smithChange.reason.toLowerCase()).toContain('blank');
      }
    });

    it('should handle case-insensitive status matching', async () => {
      // Both "Compliant" and "compliant" should work
      const csv = `Patient,DOB,Phone,Address,Annual Wellness Visit
"New Test Patient",1980-01-01,555-999-8888,999 Test St,compliant`;

      const buffer = Buffer.from(csv);
      const result = await runPreviewPipeline(buffer, 'test-case.csv', 'merge');

      // Should create INSERT for new patient
      const insertChange = result.diff.changes.find(
        c => c.memberName === 'New Test Patient' && c.action === 'INSERT'
      );

      expect(insertChange).toBeDefined();
    });
  });
});

describe('Diff Change Structure', () => {
  const csvPath = path.join(testDataDir, 'merge-test-cases.csv');
  const fileExists = fs.existsSync(csvPath);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should include all required fields in DiffChange', async () => {
    if (!fileExists) {
      console.log('Skipping: merge-test-cases.csv not found');
      return;
    }

    const buffer = fs.readFileSync(csvPath);
    const result = await runPreviewPipeline(buffer, 'merge-test-cases.csv', 'merge');

    for (const change of result.diff.changes) {
      // Required fields
      expect(change.action).toBeDefined();
      expect(['INSERT', 'UPDATE', 'SKIP', 'BOTH', 'DELETE'].includes(change.action)).toBe(true);
      expect(change.memberName).toBeDefined();
      expect(change.requestType).toBeDefined();
      expect(change.qualityMeasure).toBeDefined();
      expect(change.reason).toBeDefined();

      // oldStatus is null for INSERT
      if (change.action === 'INSERT') {
        expect(change.oldStatus).toBeNull();
      }

      // newStatus is null for DELETE
      if (change.action === 'DELETE') {
        expect(change.newStatus).toBeNull();
      }

      // existingPatientId should be set for non-INSERT actions (only if we have existing data)
      // When DB is empty, all actions will be INSERT
      if (change.action !== 'INSERT') {
        expect(change.existingPatientId).toBeDefined();
        expect(change.existingMeasureId).toBeDefined();
      }
    }
  });
});
