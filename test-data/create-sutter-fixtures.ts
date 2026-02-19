/**
 * Sutter Import Test Fixture Generator
 *
 * Generates 8 Excel (.xlsx) files for backend integration testing
 * of the Sutter/SIP import pipeline. Each file targets specific
 * use cases: action mapping, merge/dedup, edge cases, errors, etc.
 *
 * Usage:
 *   npx tsx test-data/create-sutter-fixtures.ts
 *
 * Output files written to test-data/:
 *   test-sutter-valid.xlsx
 *   test-sutter-duplicates.xlsx
 *   test-sutter-edge-cases.xlsx
 *   test-sutter-errors.xlsx
 *   test-sutter-skip-actions.xlsx
 *   test-sutter-unmapped.xlsx
 *   test-sutter-merge.xlsx
 *   test-sutter-measure-details.xlsx
 */

import * as path from 'path';

// Resolve xlsx from backend's node_modules (script runs from test-data/)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const XLSX = require(path.resolve(__dirname, '..', 'backend', 'node_modules', 'xlsx'));

const OUTPUT_DIR = path.resolve(__dirname);

// 3 title rows + header row at index 3 (standard Sutter format)
// Row 2 must be [''] (not []) so blankrows:false in XLSX parser doesn't skip it
const TITLE_ROWS: unknown[][] = [
  ['Sutter Independent Physicians - Quality Report'],
  ['Report Date: 01/15/2025'],
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

/** Build a complete Sutter tab: 3 title rows + headers + data rows */
function makeTab(dataRows: unknown[][]): unknown[][] {
  return [...TITLE_ROWS, HEADERS, ...dataRows];
}

/** Shorthand for patient row */
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
// 1. test-sutter-valid.xlsx — Happy path, all 10 action patterns
// ─────────────────────────────────────────────────────────────────
function createValid(): void {
  const phyOneRows = [
    // Row 1-2: AWV + APV same patient (tests AWV+APV merge)
    row('Anderson, Jane', '03/15/1960', '(555) 100-0001', '100 Oak Dr', '', 'AWV', ''),
    row('Anderson, Jane', '03/15/1960', '(555) 100-0001', '100 Oak Dr', '', 'APV', ''),
    // Row 3: HCC with diagnosis text
    row('Anderson, Jane', '03/15/1960', '(555) 100-0001', '100 Oak Dr', 'HCC coding: review diagnosis Z99.1', 'HCC', ''),
    // Row 4: FOBT/colonoscopy -> Colon Cancer Screening
    row('Baker, Tom', '07/22/1975', '(555) 100-0002', '200 Pine St', 'FOBT in 2025 or colonoscopy in last 10 years', 'Quality', '03/15/2024; negative'),
    // Row 5: HTN BP -> Hypertension Management
    row('Baker, Tom', '07/22/1975', '(555) 100-0002', '200 Pine St', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '12/16/2025, 158/85'),
    // Row 6: DM urine albumin -> Diabetic Nephropathy
    row('Clark, Maria', '11/05/1982', '(555) 100-0003', '300 Elm Ave', 'DM - Urine albumin/creatine ratio in 2025', 'Quality', ''),
    // Row 7: DM HbA1c -> Diabetes Control
    row('Clark, Maria', '11/05/1982', '(555) 100-0003', '300 Elm Ave', 'DM - Most recent 2025 HbA1c greater than 9%', 'Quality', '01/10/2025; 7.5'),
    // Row 8: DM Eye exam -> Diabetic Eye Exam
    row('Clark, Maria', '11/05/1982', '(555) 100-0003', '300 Elm Ave', 'DM - Eye exam in 2025 or 2024', 'Quality', '06/20/2024'),
    // Row 9: Pap/HPV -> Cervical Cancer Screening
    row('Davis, Sarah', '09/30/1988', '(555) 100-0004', '400 Maple Ln', 'Pap in 2022 - 2025 -OR- Pap & HPV test in 2020 - 2025', 'Quality', ''),
    // Row 10: Mammogram -> Breast Cancer Screening
    row('Davis, Sarah', '09/30/1988', '(555) 100-0004', '400 Maple Ln', 'Mammogram in 2024', 'Quality', '08/15/2024'),
    // Row 11: Chlamydia -> GC/Chlamydia Screening
    row('Evans, Lisa', '02/14/1995', '(555) 100-0005', '500 Cedar Rd', 'Chlamydia test in 2025', 'Quality', ''),
    // Row 12: RAS Antagonists -> ACE/ARB
    row('Foster, James', '06/01/1968', '(555) 100-0006', '600 Birch Way', 'Need dispensing events for RAS Antagonists in 2025', 'Quality', ''),
    // Row 13: Vaccine Flu -> Vaccination
    row('Green, Robert', '12/25/1950', '(555) 100-0007', '700 Spruce Ct', 'Vaccine: Flu shot due for 2024-2025 season', 'Quality', ''),
    // Row 14: Vaccine Pneumococcal -> Vaccination (same patient as 13, tests merge)
    row('Green, Robert', '12/25/1950', '(555) 100-0007', '700 Spruce Ct', 'Vaccine: Pneumococcal due', 'Quality', ''),
    // Rows 15-18: Additional patients with mixed measures
    row('Harris, Pat', '04/10/1979', '(555) 100-0008', '800 Walnut Blvd', '', 'AWV', ''),
    row('Harris, Pat', '04/10/1979', '(555) 100-0008', '800 Walnut Blvd', 'FOBT in 2025 or colonoscopy', 'Quality', '01/15/2025, 03/20/2025'),
    row('Irving, Kim', '08/18/1990', '(555) 100-0009', '900 Ash St', 'Mammogram in 2025', 'Quality', ''),
    row('Irving, Kim', '08/18/1990', '(555) 100-0009', '900 Ash St', 'Vaccine: Tdap shot due', 'Quality', ''),
  ];

  const phyTwoRows = [
    row('Johnson, Mike', '01/30/1965', '(555) 200-0001', '1000 Fir Ln', '', 'AWV', ''),
    row('Johnson, Mike', '01/30/1965', '(555) 200-0001', '1000 Fir Ln', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '130/80'),
    row('King, Anna', '05/12/1972', '(555) 200-0002', '1100 Poplar Dr', 'DM - Most recent 2025 HbA1c', 'Quality', '11/01/2025; 8.2'),
    row('King, Anna', '05/12/1972', '(555) 200-0002', '1100 Poplar Dr', 'DM - Eye exam in 2025', 'Quality', ''),
    row('Lewis, Dan', '10/08/1955', '(555) 200-0003', '1200 Willow Ave', 'HCC coding: diagnosis E11.9', 'HCC', ''),
    row('Lewis, Dan', '10/08/1955', '(555) 200-0003', '1200 Willow Ave', 'Vaccine: COVID booster due', 'Quality', ''),
    row('Moore, Sue', '03/22/1987', '(555) 200-0004', '1300 Cherry Rd', 'Pap in 2022 - 2025 -OR- Pap & HPV test in 2020 - 2025', 'Quality', ''),
    row('Moore, Sue', '03/22/1987', '(555) 200-0004', '1300 Cherry Rd', 'Chlamydia test in 2025', 'Quality', ''),
  ];

  writeWorkbook('test-sutter-valid.xlsx', {
    'Physician One': makeTab(phyOneRows),
    'Physician Two': makeTab(phyTwoRows),
    'CAR Report': [['Summary Data']],
    'Summary_NY': [['NY Data']],
  });
}

// ─────────────────────────────────────────────────────────────────
// 2. test-sutter-duplicates.xlsx — Same patient+measure merging
// ─────────────────────────────────────────────────────────────────
function createDuplicates(): void {
  const doctorARows = [
    // Same patient, same quality measure, different dates -> merge picks latest
    row('Patel, Raj', '05/10/1978', '(555) 300-0001', '100 Dup St', 'FOBT in 2025 or colonoscopy', 'Quality', '01/10/2025; negative'),
    row('Patel, Raj', '05/10/1978', '(555) 300-0001', '100 Dup St', 'FOBT in 2024 or colonoscopy', 'Quality', '06/15/2025; positive'),
    // Same patient, same AWV
    row('Nguyen, Lin', '08/20/1985', '(555) 300-0002', '200 Dup St', '', 'AWV', ''),
    row('Nguyen, Lin', '08/20/1985', '(555) 300-0002', '200 Dup St', '', 'AWV', ''),
    // Same patient, different measures -> no merge (different qualityMeasure)
    row('Nguyen, Lin', '08/20/1985', '(555) 300-0002', '200 Dup St', 'Mammogram in 2025', 'Quality', '09/01/2025'),
    row('Nguyen, Lin', '08/20/1985', '(555) 300-0002', '200 Dup St', 'Chlamydia test in 2025', 'Quality', ''),
  ];

  const doctorBRows = [
    // Same patient across doctors (will appear as separate tab import, but testing dedup within tab)
    row('Chen, Wei', '12/01/1970', '(555) 300-0003', '300 Dup St', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '01/05/2025, 142/88'),
    row('Chen, Wei', '12/01/1970', '(555) 300-0003', '300 Dup St', 'HTN - Most recent 2024 BP less than 140/90', 'Quality', '06/20/2025, 130/82'),
    // HCC duplicate
    row('Chen, Wei', '12/01/1970', '(555) 300-0003', '300 Dup St', 'HCC: Z11.1 screening', 'HCC', ''),
    row('Chen, Wei', '12/01/1970', '(555) 300-0003', '300 Dup St', 'HCC: E11.9 diabetes type 2', 'HCC', ''),
  ];

  writeWorkbook('test-sutter-duplicates.xlsx', {
    'Doctor A': makeTab(doctorARows),
    'Doctor B': makeTab(doctorBRows),
  });
}

// ─────────────────────────────────────────────────────────────────
// 3. test-sutter-edge-cases.xlsx — Special chars, dates, etc.
// ─────────────────────────────────────────────────────────────────
function createEdgeCases(): void {
  const edgeRows = [
    // Special characters in names
    row("O'Brien, Mary-Jane", '01/15/1960', '(555) 400-0001', "123 St. Mary's Dr", '', 'AWV', ''),
    row('De La Cruz, José', '03/20/1975', '(555) 400-0002', '456 Résumé Ave', 'Mammogram in 2025', 'Quality', ''),
    row('Smith Jr., Robert', '07/04/1950', '(555) 400-0003', '789 #3 Unit B', 'HCC: diagnosis review', 'HCC', ''),
    // Various date formats in Measure Details
    row('DateTest, One', '11/30/1982', '(555) 400-0004', '100 Date St', 'DM - Most recent 2025 HbA1c', 'Quality', '2025-01-15; 6.8'),
    row('DateTest, Two', '06/15/1990', '(555) 400-0005', '200 Date St', 'FOBT in 2025 or colonoscopy', 'Quality', '1/5/2025; negative'),
    // BP reading (should NOT be confused with dates)
    row('BPTest, Patient', '04/22/1973', '(555) 400-0006', '300 BP Rd', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '120/80'),
    // Missing optional fields (phone, address)
    row('Minimal, Data', '09/01/1988', '', '', 'Vaccine: Flu shot due', 'Quality', ''),
    // Very long action text
    row('LongText, Patient', '02/28/1965', '(555) 400-0007', '400 Long St', 'DM - Urine albumin/creatine ratio test needed for diabetic nephropathy monitoring in 2025', 'Quality', ''),
    // Whitespace in action text
    row('Whitespace, Test', '12/12/1977', '(555) 400-0008', '500 Space Ave', '  FOBT in 2025 or colonoscopy  ', 'Quality', ''),
    // Empty measure details
    row('EmptyMD, Patient', '05/05/1983', '(555) 400-0009', '600 Empty Ln', 'Mammogram in 2025', 'Quality', ''),
    // Excel serial-like number in measure details (should NOT parse as date)
    row('Serial, Number', '08/08/1971', '(555) 400-0010', '700 Serial Dr', 'DM - Most recent 2025 HbA1c', 'Quality', '45678'),
    // 3-part semicolon measure details
    row('ThreePart, Test', '10/10/1992', '(555) 400-0011', '800 Three St', 'DM - Most recent 2025 HbA1c', 'Quality', '01/15/2025; 7.5; %'),
  ];

  writeWorkbook('test-sutter-edge-cases.xlsx', {
    'Edge Cases': makeTab(edgeRows),
  });
}

// ─────────────────────────────────────────────────────────────────
// 4. test-sutter-errors.xlsx — Validation failures
// ─────────────────────────────────────────────────────────────────
function createErrors(): void {
  const errorTabRows = [
    // Missing Member Name
    row('', '01/15/1960', '(555) 500-0001', '100 Error St', '', 'AWV', ''),
    // Missing DOB
    row('NoDOB, Patient', '', '(555) 500-0002', '200 Error St', 'Mammogram in 2025', 'Quality', ''),
    // Missing Request Type
    row('NoRT, Patient', '03/20/1975', '(555) 500-0003', '300 Error St', 'FOBT in 2025 or colonoscopy', '', ''),
    // Unknown Request Type
    row('BadRT, Patient', '07/04/1980', '(555) 500-0004', '400 Error St', '', 'UNKNOWN', ''),
    // Valid rows mixed in (should still process)
    row('Valid, One', '11/30/1985', '(555) 500-0005', '500 Good St', '', 'AWV', ''),
    row('Valid, Two', '06/15/1990', '(555) 500-0006', '600 Good St', 'Vaccine: Flu shot due', 'Quality', ''),
    // Missing both name and DOB
    row('', '', '', '', 'Mammogram in 2025', 'Quality', ''),
  ];

  // Headers-only tab (no data rows)
  const headersOnlyTab = makeTab([]);

  writeWorkbook('test-sutter-errors.xlsx', {
    'Error Tab': makeTab(errorTabRows),
    'Headers Only': headersOnlyTab,
  });
}

// ─────────────────────────────────────────────────────────────────
// 5. test-sutter-skip-actions.xlsx — All 12 skipActions + 2 valid
// ─────────────────────────────────────────────────────────────────
function createSkipActions(): void {
  // All 11 skip actions from sutter.json + 1 extra unknown
  const skipRows = [
    row('Skip, Patient1', '01/01/1970', '', '', 'Annual Child and Young Adult Well-Care Visits', 'Quality', ''),
    row('Skip, Patient1', '01/01/1970', '', '', 'Order and/or schedule patient for osteoporosis screening tests', 'Quality', ''),
    row('Skip, Patient1', '01/01/1970', '', '', 'DM - One prescription for any intensity statin medication', 'Quality', ''),
    row('Skip, Patient2', '02/02/1975', '', '', 'Screen for Lung Cancer with low-dose computed tomography', 'Quality', ''),
    row('Skip, Patient2', '02/02/1975', '', '', 'Well-Child Visit (15-30 mos)', 'Quality', ''),
    row('Skip, Patient2', '02/02/1975', '', '', 'Need dispensing events for statin medications', 'Quality', ''),
    row('Skip, Patient3', '03/03/1980', '', '', 'Prenatal Vaccine: Influenza', 'Quality', ''),
    row('Skip, Patient3', '03/03/1980', '', '', 'One prescription for a high-intensity or moderate-intensity statin', 'Quality', ''),
    row('Skip, Patient3', '03/03/1980', '', '', 'Prenatal Vaccine: Tdap', 'Quality', ''),
    row('Skip, Patient4', '04/04/1985', '', '', 'Asthma Medication Ratio', 'Quality', ''),
    row('Skip, Patient4', '04/04/1985', '', '', 'Need dispensing events for oral diabetes medication', 'Quality', ''),
    row('Skip, Patient4', '04/04/1985', '', '', 'Well-Child Visit (first 15 mos)', 'Quality', ''),
    // 2 valid rows that SHOULD map
    row('Valid, Skip1', '05/05/1990', '', '', 'Mammogram in 2025', 'Quality', ''),
    row('Valid, Skip2', '06/06/1992', '', '', 'Vaccine: Flu shot due', 'Quality', ''),
  ];

  writeWorkbook('test-sutter-skip-actions.xlsx', {
    'Skip Test': makeTab(skipRows),
  });
}

// ─────────────────────────────────────────────────────────────────
// 6. test-sutter-unmapped.xlsx — Unmapped action aggregation
// ─────────────────────────────────────────────────────────────────
function createUnmapped(): void {
  const unmappedRows = [
    // 3 occurrences of "Custom Action Alpha"
    row('Unmap, Patient1', '01/01/1970', '', '', 'Custom Action Alpha', 'Quality', ''),
    row('Unmap, Patient2', '02/02/1975', '', '', 'Custom Action Alpha', 'Quality', ''),
    row('Unmap, Patient3', '03/03/1980', '', '', 'Custom Action Alpha', 'Quality', ''),
    // 2 occurrences of "Beta Protocol Review"
    row('Unmap, Patient4', '04/04/1985', '', '', 'Beta Protocol Review', 'Quality', ''),
    row('Unmap, Patient5', '05/05/1990', '', '', 'Beta Protocol Review', 'Quality', ''),
    // 1 occurrence of "Gamma Screening XYZ"
    row('Unmap, Patient6', '06/06/1992', '', '', 'Gamma Screening XYZ', 'Quality', ''),
    // Also include some skip actions (should NOT appear in unmapped)
    row('Unmap, Patient7', '07/07/1988', '', '', 'Annual Child and Young Adult Well-Care Visits', 'Quality', ''),
    row('Unmap, Patient7', '07/07/1988', '', '', 'Asthma Medication Ratio', 'Quality', ''),
    // 2 valid rows that DO map
    row('Valid, Unmap1', '08/08/1972', '', '', 'FOBT in 2025 or colonoscopy', 'Quality', ''),
    row('Valid, Unmap2', '09/09/1968', '', '', 'Mammogram in 2025', 'Quality', ''),
  ];

  writeWorkbook('test-sutter-unmapped.xlsx', {
    'Unmapped Test': makeTab(unmappedRows),
  });
}

// ─────────────────────────────────────────────────────────────────
// 7. test-sutter-merge.xlsx — Merge/replace against existing data
// ─────────────────────────────────────────────────────────────────
function createMerge(): void {
  const mergeRows = [
    // Rows that should INSERT (new patient+measure combos)
    row('NewPatient, Alice', '01/15/1960', '(555) 700-0001', '100 New St', '', 'AWV', ''),
    row('NewPatient, Bob', '03/20/1975', '(555) 700-0002', '200 New St', 'Mammogram in 2025', 'Quality', '07/01/2025'),
    // Rows that should UPDATE (same key, different measureStatus)
    row('Existing, Carol', '07/04/1980', '(555) 700-0003', '300 Old St', '', 'AWV', ''),
    row('Existing, Carol', '07/04/1980', '(555) 700-0003', '300 Old St', 'FOBT in 2025 or colonoscopy', 'Quality', '09/15/2025; negative'),
    // Rows that should SKIP (exact same data already exists)
    row('Existing, Dave', '11/30/1985', '(555) 700-0004', '400 Old St', 'Vaccine: Flu shot due', 'Quality', ''),
    row('Existing, Dave', '11/30/1985', '(555) 700-0004', '400 Old St', 'HCC: diagnosis E11.9', 'HCC', ''),
    // Row with tracking1 that differs from existing
    row('Existing, Eve', '06/15/1990', '(555) 700-0005', '500 Old St', 'DM - Most recent 2025 HbA1c', 'Quality', '01/10/2025; 7.5'),
    // Row for replace-all mode
    row('NewPatient, Frank', '09/01/1988', '(555) 700-0006', '600 New St', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '130/85'),
  ];

  writeWorkbook('test-sutter-merge.xlsx', {
    'Merge Test': makeTab(mergeRows),
  });
}

// ─────────────────────────────────────────────────────────────────
// 8. test-sutter-measure-details.xlsx — Measure details parsing
// ─────────────────────────────────────────────────────────────────
function createMeasureDetails(): void {
  const detailsRows = [
    // 1. Semicolon: date + reading
    row('MD, Patient01', '01/01/1970', '', '', 'FOBT in 2025 or colonoscopy', 'Quality', '03/15/2024; negative'),
    // 2. Semicolon: date + numeric
    row('MD, Patient02', '02/02/1975', '', '', 'DM - Most recent 2025 HbA1c', 'Quality', '01/10/2025; 7.5'),
    // 3. Comma-separated dates (latest wins)
    row('MD, Patient03', '03/03/1980', '', '', 'FOBT in 2025 or colonoscopy', 'Quality', '01/15/2025, 03/20/2025'),
    // 4. Date + BP
    row('MD, Patient04', '04/04/1985', '', '', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '12/16/2025, 158/85'),
    // 5. Embedded date in prose
    row('MD, Patient05', '05/05/1990', '', '', 'DM - Most recent 2025 HbA1c', 'Quality', 'Last HgbA1c: 7.8 on 01/15/2025'),
    // 6. Text only (no date)
    row('MD, Patient06', '06/06/1992', '', '', 'FOBT in 2025 or colonoscopy', 'Quality', 'Pending review'),
    // 7. Numeric only (not a date)
    row('MD, Patient07', '07/07/1988', '', '', 'DM - Most recent 2025 HbA1c', 'Quality', '7.2'),
    // 8. Empty string
    row('MD, Patient08', '08/08/1972', '', '', 'Mammogram in 2025', 'Quality', ''),
    // 9. 3-part semicolon
    row('MD, Patient09', '09/09/1968', '', '', 'DM - Most recent 2025 HbA1c', 'Quality', '01/15/2025; 7.5; %'),
    // 10. Excel serial number (should NOT be parsed as date)
    row('MD, Patient10', '10/10/1963', '', '', 'DM - Most recent 2025 HbA1c', 'Quality', '45678'),
    // 11. ISO date format
    row('MD, Patient11', '11/11/1958', '', '', 'FOBT in 2025 or colonoscopy', 'Quality', '2025-01-15'),
    // 12. BP reading only
    row('MD, Patient12', '12/12/1953', '', '', 'HTN - Most recent 2025 BP less than 140/90', 'Quality', '120/80'),
  ];

  writeWorkbook('test-sutter-measure-details.xlsx', {
    'Details Test': makeTab(detailsRows),
  });
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────
console.log('Generating Sutter test fixtures...\n');
createValid();
createDuplicates();
createEdgeCases();
createErrors();
createSkipActions();
createUnmapped();
createMerge();
createMeasureDetails();
console.log('\nDone! 8 fixture files created.');
