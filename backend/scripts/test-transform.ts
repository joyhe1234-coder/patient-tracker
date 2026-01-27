#!/usr/bin/env npx tsx
/**
 * CLI Test Script for Import Transformation
 *
 * Usage:
 *   npm run test:cli                           # Run all test files
 *   npm run test:cli -- test-valid.csv         # Run specific file
 *   npm run test:cli -- --save                 # Save results as expected
 *   npm run test:cli -- --compare              # Compare against expected
 *
 * This script allows manual testing and verification of the import pipeline
 * without starting the server.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseFile } from '../src/services/import/fileParser.js';
import { transformData } from '../src/services/import/dataTransformer.js';
import { validateRows } from '../src/services/import/validator.js';
import { mapColumns, groupMeasureColumns } from '../src/services/import/columnMapper.js';

// Paths
const testDataDir = path.join(process.cwd(), '..', 'test-data');
const expectedDir = path.join(testDataDir, 'expected');
const systemId = 'hill';

// Test files to process
const testFiles = [
  'test-valid.csv',
  'test-dates.csv',
  'test-multi-column.csv',
  'test-validation-errors.csv',
  'test-duplicates.csv',
  'test-no-measures.csv',
  'test-warnings.csv',
];

interface TestResult {
  file: string;
  parse: {
    totalRows: number;
    headers: string[];
    dataStartRow: number;
  };
  mapping: {
    mapped: number;
    skipped: number;
    unmapped: number;
    measureTypes: number;
    missingRequired: string[];
  };
  transform: {
    inputRows: number;
    outputRows: number;
    patientsWithNoMeasures: number;
    errors: number;
  };
  validation: {
    valid: boolean;
    errors: number;
    warnings: number;
    duplicateGroups: number;
  };
  // Detailed data for comparison
  details?: {
    transformedRows: Array<{
      memberName: string;
      qualityMeasure: string;
      measureStatus: string | null;
      sourceRowIndex: number;
    }>;
    validationErrors: Array<{
      rowIndex: number;
      field: string;
      message: string;
      memberName?: string;
    }>;
    patientsWithNoMeasures: Array<{
      rowIndex: number;
      memberName: string;
    }>;
  };
}

function processFile(filePath: string, includeDetails: boolean = false): TestResult {
  const fileName = path.basename(filePath);
  const buffer = fs.readFileSync(filePath);

  // Parse
  const parseResult = parseFile(buffer, fileName);

  // Map columns
  const mappingResult = mapColumns(parseResult.headers, systemId);
  const measureGroups = groupMeasureColumns(mappingResult.mappedColumns);

  // Transform
  const transformResult = transformData(
    parseResult.headers,
    parseResult.rows,
    systemId,
    parseResult.dataStartRow
  );

  // Validate
  const validationResult = validateRows(transformResult.rows);

  const result: TestResult = {
    file: fileName,
    parse: {
      totalRows: parseResult.totalRows,
      headers: parseResult.headers,
      dataStartRow: parseResult.dataStartRow,
    },
    mapping: {
      mapped: mappingResult.stats.mapped,
      skipped: mappingResult.stats.skipped,
      unmapped: mappingResult.stats.unmapped,
      measureTypes: measureGroups.size,
      missingRequired: mappingResult.missingRequired,
    },
    transform: {
      inputRows: transformResult.stats.inputRows,
      outputRows: transformResult.stats.outputRows,
      patientsWithNoMeasures: transformResult.stats.patientsWithNoMeasures,
      errors: transformResult.errors.length,
    },
    validation: {
      valid: validationResult.valid,
      errors: validationResult.errors.length,
      warnings: validationResult.warnings.length,
      duplicateGroups: validationResult.duplicates.length,
    },
  };

  if (includeDetails) {
    result.details = {
      transformedRows: transformResult.rows.map(r => ({
        memberName: r.memberName,
        qualityMeasure: r.qualityMeasure,
        measureStatus: r.measureStatus,
        sourceRowIndex: r.sourceRowIndex,
      })),
      validationErrors: validationResult.errors.map(e => ({
        rowIndex: e.rowIndex,
        field: e.field,
        message: e.message,
        memberName: e.memberName,
      })),
      patientsWithNoMeasures: transformResult.patientsWithNoMeasures.map(p => ({
        rowIndex: p.rowIndex,
        memberName: p.memberName,
      })),
    };
  }

  return result;
}

function printResult(result: TestResult): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`File: ${result.file}`);
  console.log(`${'='.repeat(60)}`);

  console.log('\n📄 Parse:');
  console.log(`   Total rows: ${result.parse.totalRows}`);
  console.log(`   Data starts at row: ${result.parse.dataStartRow}`);
  console.log(`   Headers: ${result.parse.headers.length} columns`);

  console.log('\n🗺️  Mapping:');
  console.log(`   Mapped: ${result.mapping.mapped}`);
  console.log(`   Skipped: ${result.mapping.skipped}`);
  console.log(`   Unmapped: ${result.mapping.unmapped}`);
  console.log(`   Measure types: ${result.mapping.measureTypes}`);
  if (result.mapping.missingRequired.length > 0) {
    console.log(`   ⚠️  Missing required: ${result.mapping.missingRequired.join(', ')}`);
  }

  console.log('\n🔄 Transform:');
  console.log(`   Input rows: ${result.transform.inputRows}`);
  console.log(`   Output rows: ${result.transform.outputRows}`);
  console.log(`   Patients with no measures: ${result.transform.patientsWithNoMeasures}`);
  console.log(`   Transform errors: ${result.transform.errors}`);

  console.log('\n✅ Validation:');
  console.log(`   Valid: ${result.validation.valid ? '✅ YES' : '❌ NO'}`);
  console.log(`   Errors: ${result.validation.errors}`);
  console.log(`   Warnings: ${result.validation.warnings}`);
  console.log(`   Duplicate groups: ${result.validation.duplicateGroups}`);
}

function compareResults(actual: TestResult, expected: TestResult): { match: boolean; differences: string[] } {
  const differences: string[] = [];

  // Compare key metrics
  if (actual.parse.totalRows !== expected.parse.totalRows) {
    differences.push(`parse.totalRows: expected ${expected.parse.totalRows}, got ${actual.parse.totalRows}`);
  }
  if (actual.parse.dataStartRow !== expected.parse.dataStartRow) {
    differences.push(`parse.dataStartRow: expected ${expected.parse.dataStartRow}, got ${actual.parse.dataStartRow}`);
  }
  if (actual.transform.inputRows !== expected.transform.inputRows) {
    differences.push(`transform.inputRows: expected ${expected.transform.inputRows}, got ${actual.transform.inputRows}`);
  }
  if (actual.transform.outputRows !== expected.transform.outputRows) {
    differences.push(`transform.outputRows: expected ${expected.transform.outputRows}, got ${actual.transform.outputRows}`);
  }
  if (actual.transform.patientsWithNoMeasures !== expected.transform.patientsWithNoMeasures) {
    differences.push(`transform.patientsWithNoMeasures: expected ${expected.transform.patientsWithNoMeasures}, got ${actual.transform.patientsWithNoMeasures}`);
  }
  if (actual.validation.valid !== expected.validation.valid) {
    differences.push(`validation.valid: expected ${expected.validation.valid}, got ${actual.validation.valid}`);
  }
  if (actual.validation.errors !== expected.validation.errors) {
    differences.push(`validation.errors: expected ${expected.validation.errors}, got ${actual.validation.errors}`);
  }
  if (actual.validation.duplicateGroups !== expected.validation.duplicateGroups) {
    differences.push(`validation.duplicateGroups: expected ${expected.validation.duplicateGroups}, got ${actual.validation.duplicateGroups}`);
  }

  return { match: differences.length === 0, differences };
}

async function main() {
  const args = process.argv.slice(2);
  const saveMode = args.includes('--save');
  const compareMode = args.includes('--compare');
  const detailsMode = args.includes('--details');

  // Filter to specific file if provided
  const specificFile = args.find(a => !a.startsWith('--'));
  const filesToProcess = specificFile
    ? testFiles.filter(f => f.includes(specificFile))
    : testFiles;

  if (filesToProcess.length === 0) {
    console.error(`No test files found matching: ${specificFile}`);
    process.exit(1);
  }

  console.log('🧪 Import Transform Test Script');
  console.log(`Mode: ${saveMode ? 'SAVE' : compareMode ? 'COMPARE' : 'RUN'}`);
  console.log(`Files: ${filesToProcess.length}`);

  // Ensure expected directory exists
  if (saveMode && !fs.existsSync(expectedDir)) {
    fs.mkdirSync(expectedDir, { recursive: true });
  }

  let allPassed = true;
  const results: TestResult[] = [];

  for (const fileName of filesToProcess) {
    const filePath = path.join(testDataDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠️  Skipping ${fileName} (file not found)`);
      continue;
    }

    try {
      const result = processFile(filePath, detailsMode || saveMode);
      results.push(result);

      if (saveMode) {
        // Save result as expected
        const expectedPath = path.join(expectedDir, `${fileName}.json`);
        fs.writeFileSync(expectedPath, JSON.stringify(result, null, 2));
        console.log(`\n💾 Saved: ${expectedPath}`);
        printResult(result);
      } else if (compareMode) {
        // Compare against expected
        const expectedPath = path.join(expectedDir, `${fileName}.json`);
        if (!fs.existsSync(expectedPath)) {
          console.log(`\n⚠️  No expected file for ${fileName}, skipping comparison`);
          printResult(result);
        } else {
          const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));
          const comparison = compareResults(result, expected);

          if (comparison.match) {
            console.log(`\n✅ ${fileName}: PASSED`);
          } else {
            console.log(`\n❌ ${fileName}: FAILED`);
            comparison.differences.forEach(d => console.log(`   - ${d}`));
            allPassed = false;
          }
        }
      } else {
        // Just run and print
        printResult(result);
      }
    } catch (error) {
      console.error(`\n❌ Error processing ${fileName}:`, error);
      allPassed = false;
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Files processed: ${results.length}`);

  if (compareMode) {
    console.log(`Result: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
    process.exit(allPassed ? 0 : 1);
  }
}

main().catch(console.error);
