# Test Data Files for Import Testing

These CSV files are used to test the import functionality (Phase 5c-5d).

## Files

| File | Description | Test Cases |
|------|-------------|------------|
| `test-valid.csv` | 10 patients with valid data across multiple measures | TC-15.*, TC-16.1-16.4, TC-20.5 |
| `test-dates.csv` | Various date formats including invalid dates | TC-17.* |
| `test-multi-column.csv` | Multiple columns mapping to same quality measure (age brackets) | TC-18.* |
| `test-validation-errors.csv` | Missing/invalid fields to trigger validation errors | TC-19.* |
| `test-duplicates.csv` | Duplicate patient+measure rows within same file | TC-19.10, TC-20.4 |
| `test-no-measures.csv` | Mix of patients with and without measure data | TC-16.5, TC-21.7 |
| `test-warnings.csv` | Valid data but missing optional fields (phone) | TC-20.3, TC-20.6, TC-20.9 |

## Usage

1. Navigate to http://localhost:5176/import-test
2. Upload one of these CSV files
3. Click Parse, Transform, or Validate to test

## Expected Results

### test-valid.csv
- Original Rows: 10
- Generated Rows: ~40 (10 patients × 4 measures with data)
- Validation: All pass with possible phone/status warnings

### test-dates.csv
- Tests date parsing for: MM/DD/YYYY, M/D/YYYY, M/D/YY, YYYY-MM-DD, M.D.YYYY, Excel serial
- Row 7 should show error for invalid DOB "abc"
- Row 8 should show error for missing DOB

### test-multi-column.csv
- Tests "any non-compliant wins" logic
- Row 1 (AllCompliant): Should show "Screening test completed"
- Row 2 (AnyNonCompliant): Should show "Not Addressed"
- Row 6 (AllEmpty): Should have no Breast Cancer or Colon Cancer rows generated

### test-validation-errors.csv
- Row 2: Missing member name error
- Row 3: Missing DOB error
- Row 4: Invalid DOB format error
- Row 6: Appears in "Patients with No Measures"

### test-duplicates.csv
- Smith, John: 2 duplicate rows (same patient, same measures)
- Williams, Robert: 3 duplicate rows
- Should show 2 duplicate groups

### test-no-measures.csv
- 5 patients with no measure data (rows 2, 4, 5, 7, 9)
- Should show "Patients with No Measures (5)"
- Only 5 patients should generate output rows

### test-warnings.csv
- Multiple patients missing phone numbers
- Should show warnings but canProceed = true
- Yellow validation banner

## Column Mapping (Hill Healthcare)

| CSV Column | Maps To |
|------------|---------|
| Patient | memberName |
| DOB | memberDob |
| Phone | memberTelephone |
| Address | memberAddress |
| Annual Wellness Visit Q1 | AWV - statusDate |
| Annual Wellness Visit Q2 | AWV - complianceStatus |
| Eye Exam Q1/Q2 | Diabetic Eye Exam |
| BP Control Q1/Q2 | Hypertension Management |
| Breast Cancer Screening E Q1/Q2 | Breast Cancer Screening |
| Colorectal Cancer Screening E Q1/Q2 | Colon Cancer Screening |
