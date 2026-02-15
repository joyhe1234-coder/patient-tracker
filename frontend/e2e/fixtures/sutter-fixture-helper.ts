/**
 * Sutter Import E2E Test Fixture Helper
 *
 * Generates minimal Excel workbooks for Playwright E2E tests.
 * Uses the xlsx package from the backend workspace to create real .xlsx files.
 *
 * Each fixture is created lazily on first call and cached to disk so that
 * subsequent test runs reuse the same file without regeneration.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve the xlsx module from the backend's node_modules.
 * Playwright tests run in Node.js so require() works directly.
 */
function getXLSX(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('xlsx');
  } catch {
    // Fallback: resolve from backend directory relative to this file
    const backendXlsx = path.resolve(__dirname, '..', '..', '..', 'backend', 'node_modules', 'xlsx');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(backendXlsx);
  }
}

const FIXTURES_DIR = path.resolve(__dirname);

// Sutter header row is at index 3 (row 4 in Excel), so rows 0-2 are title/blank
const SUTTER_TITLE_ROWS: (string | undefined)[][] = [
  ['Sutter Independent Physicians - Quality Report'],
  ['Report Date: 01/15/2025'],
  [], // blank row before headers
];

const SUTTER_HEADERS = [
  'Member Name',
  'Member DOB',
  'Member Telephone',
  'Member Home Address',
  'Health Plans',
  'Race-Ethnicity',
  'Possible Actions Needed',
  'Request Type',
  'Measure Details',
  'High Priority',
];

/**
 * Get path to the multi-tab Sutter fixture file.
 * Creates the file if it does not exist.
 *
 * Contains:
 * - "Smith, John" tab: AWV, HCC, Quality rows (2 patients, 5 data rows)
 * - "Jones, Mary" tab: Quality rows with some unmapped actions (2 patients, 4 rows)
 * - "CAR Report" tab: skip tab (exact match)
 * - "Perf by Measure Summary" tab: skip tab (prefix match)
 */
export async function getMultiTabFixturePath(): Promise<string> {
  const filePath = path.join(FIXTURES_DIR, 'sutter-multi-tab.xlsx');
  if (!fs.existsSync(filePath)) {
    createMultiTabWorkbook(filePath);
  }
  return filePath;
}

/**
 * Get path to the single-tab Sutter fixture file.
 * Creates the file if it does not exist.
 *
 * Contains a single valid physician tab "Williams, Pat" with AWV and Quality rows.
 */
export async function getSingleTabFixturePath(): Promise<string> {
  const filePath = path.join(FIXTURES_DIR, 'sutter-single-tab.xlsx');
  if (!fs.existsSync(filePath)) {
    createSingleTabWorkbook(filePath);
  }
  return filePath;
}

/**
 * Get path to a Sutter file with no valid physician tabs.
 * Creates the file if it does not exist.
 */
export async function getNoValidTabsFixturePath(): Promise<string> {
  const filePath = path.join(FIXTURES_DIR, 'sutter-no-valid-tabs.xlsx');
  if (!fs.existsSync(filePath)) {
    createNoValidTabsWorkbook(filePath);
  }
  return filePath;
}

/**
 * Get path to a Sutter file with a valid tab that has headers but no data rows.
 * Creates the file if it does not exist.
 */
export async function getEmptyTabFixturePath(): Promise<string> {
  const filePath = path.join(FIXTURES_DIR, 'sutter-empty-tab.xlsx');
  if (!fs.existsSync(filePath)) {
    createEmptyTabWorkbook(filePath);
  }
  return filePath;
}

/**
 * Get path to a Hill-format Excel file (wide format, not Sutter long format).
 * Creates the file if it does not exist.
 */
export async function getHillFormatFixturePath(): Promise<string> {
  const filePath = path.join(FIXTURES_DIR, 'hill-format.xlsx');
  if (!fs.existsSync(filePath)) {
    createHillFormatWorkbook(filePath);
  }
  return filePath;
}

// ---- Internal workbook creation functions ----

function createMultiTabWorkbook(filePath: string): void {
  const xlsx = getXLSX();
  const wb = xlsx.utils.book_new();

  // Tab 1: "Smith, John" with mixed request types
  const smithData = [
    ...SUTTER_TITLE_ROWS,
    SUTTER_HEADERS,
    ['Doe, Jane', '01/15/1960', '(555) 123-4567', '123 Main St', 'Plan A', 'White', '', 'AWV', '', 'N'],
    ['Doe, Jane', '01/15/1960', '(555) 123-4567', '123 Main St', 'Plan A', 'White', 'Diagnosis review needed', 'HCC', '', 'Y'],
    ['Doe, Jane', '01/15/1960', '(555) 123-4567', '123 Main St', 'Plan A', 'White', 'FOBT in 2024 or colonoscopy in last 10 years', 'Quality', '03/15/2024; negative', 'N'],
    ['Brown, Bob', '03/20/1975', '(555) 987-6543', '456 Oak Ave', 'Plan B', 'Hispanic', 'HTN - Most recent 2024 BP less than 140/90', 'Quality', '130/85', 'N'],
    ['Brown, Bob', '03/20/1975', '(555) 987-6543', '456 Oak Ave', 'Plan B', 'Hispanic', '', 'AWV', '', 'N'],
  ];
  const ws1 = xlsx.utils.aoa_to_sheet(smithData);
  xlsx.utils.book_append_sheet(wb, ws1, 'Smith, John');

  // Tab 2: "Jones, Mary" with some unmapped actions
  const jonesData = [
    ...SUTTER_TITLE_ROWS,
    SUTTER_HEADERS,
    ['Wilson, Sam', '06/10/1985', '(555) 222-3333', '789 Pine Rd', 'Plan C', 'Asian', 'Mammogram in 2024', 'Quality', '', 'N'],
    ['Wilson, Sam', '06/10/1985', '(555) 222-3333', '789 Pine Rd', 'Plan C', 'Asian', 'Annual Child and Young Adult Well-Care Visits', 'Quality', '', 'N'],
    ['Garcia, Ana', '11/30/1990', '(555) 444-5555', '321 Elm Blvd', 'Plan A', 'Hispanic', 'Vaccine: Flu shot due', 'Quality', '', 'N'],
    ['Garcia, Ana', '11/30/1990', '(555) 444-5555', '321 Elm Blvd', 'Plan A', 'Hispanic', 'Screen for Lung Cancer with low-dose computed tomography', 'Quality', '', 'N'],
  ];
  const ws2 = xlsx.utils.aoa_to_sheet(jonesData);
  xlsx.utils.book_append_sheet(wb, ws2, 'Jones, Mary');

  // Skip tabs
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Summary Data']]), 'CAR Report');
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Perf Data']]), 'Perf by Measure Summary');

  xlsx.writeFile(wb, filePath);
}

function createSingleTabWorkbook(filePath: string): void {
  const xlsx = getXLSX();
  const wb = xlsx.utils.book_new();

  const data = [
    ...SUTTER_TITLE_ROWS,
    SUTTER_HEADERS,
    ['Adams, Tim', '02/28/1970', '(555) 111-2222', '100 First St', 'Plan A', 'White', '', 'AWV', '', 'N'],
    ['Adams, Tim', '02/28/1970', '(555) 111-2222', '100 First St', 'Plan A', 'White', 'DM - Most recent 2024 HbA1c greater than 9%', 'Quality', '01/10/2024; 8.5', 'N'],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Williams, Pat');

  xlsx.writeFile(wb, filePath);
}

function createNoValidTabsWorkbook(filePath: string): void {
  const xlsx = getXLSX();
  const wb = xlsx.utils.book_new();

  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Data']]), 'CAR Report');
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Data']]), 'Perf by Measure');
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Data']]), 'Summary_NY');

  xlsx.writeFile(wb, filePath);
}

function createEmptyTabWorkbook(filePath: string): void {
  const xlsx = getXLSX();
  const wb = xlsx.utils.book_new();

  const data = [
    ...SUTTER_TITLE_ROWS,
    SUTTER_HEADERS,
    // No data rows after headers
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Empty, Doctor');

  xlsx.writeFile(wb, filePath);
}

function createHillFormatWorkbook(filePath: string): void {
  const xlsx = getXLSX();
  const wb = xlsx.utils.book_new();

  const hillHeaders = [
    'Member Name',
    'DOB',
    'Telephone',
    'Address',
    'AWV Q1 Status',
    'AWV Q2 Status',
    'Colon Cancer Screening Q1 Status',
    'Colon Cancer Screening Q2 Status',
  ];
  const data = [
    hillHeaders,
    ['Hill, Patient', '01/01/1980', '555-1234', '100 Hill Rd', 'Compliant', '', 'Non Compliant', ''],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');

  xlsx.writeFile(wb, filePath);
}
