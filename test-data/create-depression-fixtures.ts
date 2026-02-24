/**
 * Depression Screening Mock Data Generator
 *
 * Creates test import files for Depression Screening:
 *   - test-sutter-depression.xlsx (Sutter format with Depression Screening actions)
 *
 * Usage:
 *   npx tsx test-data/create-depression-fixtures.ts
 *
 * Output files written to backend/test-data/
 */

import * as path from 'path';

const XLSX = require(path.resolve(__dirname, '..', 'backend', 'node_modules', 'xlsx'));

const OUTPUT_DIR = path.resolve(__dirname, '..', 'backend', 'test-data');

// Standard Sutter format: 3 title rows + header row at index 3
const TITLE_ROWS: unknown[][] = [
  ['Sutter Independent Physicians - Quality Report'],
  ['Report Date: 02/01/2026'],
  [''],
];

const HEADERS = [
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

function makeTab(dataRows: unknown[][]): unknown[][] {
  return [...TITLE_ROWS, HEADERS, ...dataRows];
}

function row(
  name: string,
  dob: string,
  phone: string,
  address: string,
  action: string,
  requestType: string,
  measureDetails = '',
  highPriority = 'N',
  healthPlan = 'Plan A',
  raceEthnicity = 'White',
): unknown[] {
  return [name, dob, phone, address, healthPlan, raceEthnicity, action, requestType, measureDetails, highPriority];
}

function writeWorkbook(filename: string, sheets: Record<string, unknown[][]>): void {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const filePath = path.join(OUTPUT_DIR, filename);
  XLSX.writeFile(wb, filePath);
  console.log(`  Created: ${filePath}`);
}

// ─────────────────────────────────────────────────────────────────
// Sutter Depression Screening focused test file
// Tests all 3 action regex patterns + mixed with other measures
// ─────────────────────────────────────────────────────────────────
function createSutterDepression(): void {
  const drSmithRows = [
    // --- Depression Screening variants ---
    // Pattern 1: "Depression Screening due in 2025" (^Depression [Ss]creening)
    row('Johnson, Daron', '07/22/1962', '(555) 301-0001', '100 Oak Dr', 'Depression Screening due in 2025', 'Quality', ''),
    // Pattern 2: "PHQ-9 screening needed" (^PHQ-?9)
    row('Ricardez, Ivan', '03/15/1978', '(555) 301-0002', '200 Pine St', 'PHQ-9 screening needed', 'Quality', ''),
    // Pattern 3: "Screen for depression" (^Screen.*depression)
    row('Aguilera, Victor', '11/05/1985', '(555) 301-0003', '300 Elm Ave', 'Screen for depression in 2025', 'Quality', ''),
    // Lowercase variant: "Depression screening" (^Depression [Ss]creening)
    row('Torres, Carmen', '05/20/1970', '(555) 301-0004', '400 Maple Ln', 'Depression screening due 2026', 'Quality', ''),
    // PHQ9 without hyphen variant (^PHQ-?9)
    row('Park, Soo-Jin', '09/08/1990', '(555) 301-0005', '500 Cedar Rd', 'PHQ9 due for annual screening', 'Quality', ''),

    // --- Mixed with other common measures ---
    // AWV
    row('Johnson, Daron', '07/22/1962', '(555) 301-0001', '100 Oak Dr', '', 'AWV', ''),
    // HTN
    row('Ricardez, Ivan', '03/15/1978', '(555) 301-0002', '200 Pine St', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '01/15/2026, 132/84'),
    // Mammogram
    row('Torres, Carmen', '05/20/1970', '(555) 301-0004', '400 Maple Ln', 'Mammogram in 2025', 'Quality', '08/20/2025'),
    // FOBT/colonoscopy
    row('Park, Soo-Jin', '09/08/1990', '(555) 301-0005', '500 Cedar Rd', 'FOBT in 2025 or colonoscopy in last 10 years', 'Quality', ''),
    // DM Eye exam
    row('Aguilera, Victor', '11/05/1985', '(555) 301-0003', '300 Elm Ave', 'DM - Eye exam in 2025 or 2024', 'Quality', '06/15/2025'),
  ];

  const drJonesRows = [
    // Depression Screening in second physician tab
    row('Williams, Sarah', '06/08/1990', '(555) 302-0001', '600 Birch Way', 'Depression Screening in 2026', 'Quality', ''),
    row('Chen, David', '08/23/1965', '(555) 302-0002', '700 Spruce Ct', 'PHQ-9 screening overdue', 'Quality', ''),
    row('Patel, Amit', '09/17/1958', '(555) 302-0003', '800 Walnut Blvd', 'Screen for depression - overdue', 'Quality', ''),
    // Same patient with AWV + Depression
    row('Williams, Sarah', '06/08/1990', '(555) 302-0001', '600 Birch Way', '', 'AWV', ''),
    // HTN for Chen
    row('Chen, David', '08/23/1965', '(555) 302-0002', '700 Spruce Ct', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '02/01/2026, 128/82'),
    // Vaccine
    row('Patel, Amit', '09/17/1958', '(555) 302-0003', '800 Walnut Blvd', 'Vaccine: Flu shot due for 2025-2026 season', 'Quality', ''),
  ];

  writeWorkbook('test-sutter-depression.xlsx', {
    'Dr Smith': makeTab(drSmithRows),
    'Dr Jones': makeTab(drJonesRows),
    'CAR Report': [['Summary Data']],
    'Summary_NY': [['NY Data']],
  });
}

// Run
console.log('Creating Depression Screening test fixtures...');
createSutterDepression();
console.log('Done!');
