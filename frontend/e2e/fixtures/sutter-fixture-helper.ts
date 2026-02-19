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

/**
 * Get path to a multi-measure Sutter fixture covering all 10 action patterns.
 * Creates the file if it does not exist.
 *
 * Contains:
 * - "Physician One" tab: 18 rows covering AWV, APV, HCC, and all 10 Quality action patterns
 * - "Physician Two" tab: 8 rows with mixed measures
 * - "CAR Report" tab: skip tab
 * - "Summary_NY" tab: skip tab
 */
export async function getValidMultiMeasureFixturePath(): Promise<string> {
  const filePath = path.join(FIXTURES_DIR, 'sutter-valid-multi-measure.xlsx');
  if (!fs.existsSync(filePath)) {
    createValidMultiMeasureWorkbook(filePath);
  }
  return filePath;
}

/**
 * Get path to a Sutter fixture with 12 skip actions + 2 valid mapped actions.
 * Creates the file if it does not exist.
 */
export async function getSkipActionsFixturePath(): Promise<string> {
  const filePath = path.join(FIXTURES_DIR, 'sutter-skip-actions.xlsx');
  if (!fs.existsSync(filePath)) {
    createSkipActionsWorkbook(filePath);
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

function createValidMultiMeasureWorkbook(filePath: string): void {
  const xlsx = getXLSX();
  const wb = xlsx.utils.book_new();

  // Physician One: all 10 action patterns + AWV + APV + HCC
  const phyOneData = [
    ...SUTTER_TITLE_ROWS,
    SUTTER_HEADERS,
    // AWV + APV (same patient, merge test)
    ['Anderson, Jane', '03/15/1960', '(555) 100-0001', '100 Oak Dr', 'Plan A', 'White', '', 'AWV', '', 'N'],
    ['Anderson, Jane', '03/15/1960', '(555) 100-0001', '100 Oak Dr', 'Plan A', 'White', '', 'APV', '', 'N'],
    // HCC with diagnosis
    ['Anderson, Jane', '03/15/1960', '(555) 100-0001', '100 Oak Dr', 'Plan A', 'White', 'HCC coding: review Z99.1', 'HCC', '', 'Y'],
    // FOBT (Colon Cancer Screening)
    ['Baker, Tom', '07/22/1975', '(555) 100-0002', '200 Pine St', 'Plan B', 'Hispanic', 'FOBT in 2025 or colonoscopy in last 10 years', 'Quality', '03/15/2024; negative', 'N'],
    // HTN (Hypertension Management)
    ['Baker, Tom', '07/22/1975', '(555) 100-0002', '200 Pine St', 'Plan B', 'Hispanic', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '158/85', 'N'],
    // DM urine albumin (Diabetic Nephropathy)
    ['Clark, Maria', '11/05/1982', '(555) 100-0003', '300 Elm Ave', 'Plan A', 'White', 'DM - Urine albumin/creatine ratio in 2025', 'Quality', '', 'N'],
    // DM HbA1c (Diabetes Control)
    ['Clark, Maria', '11/05/1982', '(555) 100-0003', '300 Elm Ave', 'Plan A', 'White', 'DM - Most recent 2025 HbA1c greater than 9%', 'Quality', '01/10/2025; 7.5', 'N'],
    // DM Eye exam (Diabetic Eye Exam)
    ['Clark, Maria', '11/05/1982', '(555) 100-0003', '300 Elm Ave', 'Plan A', 'White', 'DM - Eye exam in 2025 or 2024', 'Quality', '06/20/2024', 'N'],
    // Pap/HPV (Cervical Cancer Screening)
    ['Davis, Sarah', '09/30/1988', '(555) 100-0004', '400 Maple Ln', 'Plan A', 'White', 'Pap in 2022 - 2025 -OR- Pap & HPV test in 2020 - 2025', 'Quality', '', 'N'],
    // Mammogram (Breast Cancer Screening)
    ['Davis, Sarah', '09/30/1988', '(555) 100-0004', '400 Maple Ln', 'Plan A', 'White', 'Mammogram in 2024', 'Quality', '08/15/2024', 'N'],
    // Chlamydia (GC/Chlamydia Screening)
    ['Evans, Lisa', '02/14/1995', '(555) 100-0005', '500 Cedar Rd', 'Plan B', 'Hispanic', 'Chlamydia test in 2025', 'Quality', '', 'N'],
    // RAS Antagonists (ACE/ARB)
    ['Foster, James', '06/01/1968', '(555) 100-0006', '600 Birch Way', 'Plan A', 'White', 'Need dispensing events for RAS Antagonists in 2025', 'Quality', '', 'N'],
    // Vaccine: Flu (Vaccination)
    ['Green, Robert', '12/25/1950', '(555) 100-0007', '700 Spruce Ct', 'Plan A', 'White', 'Vaccine: Flu shot due for 2024-2025 season', 'Quality', '', 'N'],
    // Vaccine: Pneumococcal (same patient, merge)
    ['Green, Robert', '12/25/1950', '(555) 100-0007', '700 Spruce Ct', 'Plan A', 'White', 'Vaccine: Pneumococcal due', 'Quality', '', 'N'],
    // Additional mixed
    ['Harris, Pat', '04/10/1979', '(555) 100-0008', '800 Walnut Blvd', 'Plan B', 'Hispanic', '', 'AWV', '', 'N'],
    ['Harris, Pat', '04/10/1979', '(555) 100-0008', '800 Walnut Blvd', 'Plan B', 'Hispanic', 'FOBT in 2025 or colonoscopy', 'Quality', '01/15/2025, 03/20/2025', 'N'],
    ['Irving, Kim', '08/18/1990', '(555) 100-0009', '900 Ash St', 'Plan A', 'White', 'Mammogram in 2025', 'Quality', '', 'N'],
    ['Irving, Kim', '08/18/1990', '(555) 100-0009', '900 Ash St', 'Plan A', 'White', 'Vaccine: Tdap shot due', 'Quality', '', 'N'],
  ];
  const ws1 = xlsx.utils.aoa_to_sheet(phyOneData);
  xlsx.utils.book_append_sheet(wb, ws1, 'Physician One');

  // Physician Two: mixed measures
  const phyTwoData = [
    ...SUTTER_TITLE_ROWS,
    SUTTER_HEADERS,
    ['Johnson, Mike', '01/30/1965', '(555) 200-0001', '1000 Fir Ln', 'Plan A', 'White', '', 'AWV', '', 'N'],
    ['Johnson, Mike', '01/30/1965', '(555) 200-0001', '1000 Fir Ln', 'Plan A', 'White', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '130/80', 'N'],
    ['King, Anna', '05/12/1972', '(555) 200-0002', '1100 Poplar Dr', 'Plan B', 'Hispanic', 'DM - Most recent 2025 HbA1c', 'Quality', '11/01/2025; 8.2', 'N'],
    ['King, Anna', '05/12/1972', '(555) 200-0002', '1100 Poplar Dr', 'Plan B', 'Hispanic', 'DM - Eye exam in 2025', 'Quality', '', 'N'],
    ['Lewis, Dan', '10/08/1955', '(555) 200-0003', '1200 Willow Ave', 'Plan A', 'White', 'HCC coding: diagnosis E11.9', 'HCC', '', 'N'],
    ['Lewis, Dan', '10/08/1955', '(555) 200-0003', '1200 Willow Ave', 'Plan A', 'White', 'Vaccine: COVID booster due', 'Quality', '', 'N'],
    ['Moore, Sue', '03/22/1987', '(555) 200-0004', '1300 Cherry Rd', 'Plan A', 'White', 'Pap in 2022 - 2025 -OR- Pap & HPV test in 2020 - 2025', 'Quality', '', 'N'],
    ['Moore, Sue', '03/22/1987', '(555) 200-0004', '1300 Cherry Rd', 'Plan A', 'White', 'Chlamydia test in 2025', 'Quality', '', 'N'],
  ];
  const ws2 = xlsx.utils.aoa_to_sheet(phyTwoData);
  xlsx.utils.book_append_sheet(wb, ws2, 'Physician Two');

  // Skip tabs
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['Summary Data']]), 'CAR Report');
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['NY Data']]), 'Summary_NY');

  xlsx.writeFile(wb, filePath);
}

function createSkipActionsWorkbook(filePath: string): void {
  const xlsx = getXLSX();
  const wb = xlsx.utils.book_new();

  const data = [
    ...SUTTER_TITLE_ROWS,
    SUTTER_HEADERS,
    // 11 skip actions
    ['Skip, Patient1', '01/01/1970', '', '', 'Plan A', 'White', 'Annual Child and Young Adult Well-Care Visits', 'Quality', '', 'N'],
    ['Skip, Patient1', '01/01/1970', '', '', 'Plan A', 'White', 'Order and/or schedule patient for osteoporosis screening tests', 'Quality', '', 'N'],
    ['Skip, Patient1', '01/01/1970', '', '', 'Plan A', 'White', 'DM - One prescription for any intensity statin medication', 'Quality', '', 'N'],
    ['Skip, Patient2', '02/02/1975', '', '', 'Plan A', 'White', 'Screen for Lung Cancer with low-dose computed tomography', 'Quality', '', 'N'],
    ['Skip, Patient2', '02/02/1975', '', '', 'Plan A', 'White', 'Well-Child Visit (15-30 mos)', 'Quality', '', 'N'],
    ['Skip, Patient2', '02/02/1975', '', '', 'Plan A', 'White', 'Need dispensing events for statin medications', 'Quality', '', 'N'],
    ['Skip, Patient3', '03/03/1980', '', '', 'Plan A', 'White', 'Prenatal Vaccine: Influenza', 'Quality', '', 'N'],
    ['Skip, Patient3', '03/03/1980', '', '', 'Plan A', 'White', 'One prescription for a high-intensity or moderate-intensity statin', 'Quality', '', 'N'],
    ['Skip, Patient3', '03/03/1980', '', '', 'Plan A', 'White', 'Prenatal Vaccine: Tdap', 'Quality', '', 'N'],
    ['Skip, Patient4', '04/04/1985', '', '', 'Plan A', 'White', 'Asthma Medication Ratio', 'Quality', '', 'N'],
    ['Skip, Patient4', '04/04/1985', '', '', 'Plan A', 'White', 'Need dispensing events for oral diabetes medication', 'Quality', '', 'N'],
    // 2 valid mapped actions
    ['Valid, Patient1', '05/05/1990', '', '', 'Plan A', 'White', 'Mammogram in 2025', 'Quality', '', 'N'],
    ['Valid, Patient2', '06/06/1992', '', '', 'Plan A', 'White', 'Vaccine: Flu shot due', 'Quality', '', 'N'],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Skip Actions');

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
