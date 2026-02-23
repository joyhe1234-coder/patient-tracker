# Smart Column Mapping Test Spreadsheets

Test data files for the Smart Column Mapping feature. Each file targets specific test scenarios.

## File Inventory

| # | File | System | Conflict Type Tested | Expected Outcome |
|---|------|--------|---------------------|------------------|
| 01 | `test-01-exact-match.csv` | Hill | None | All headers match exactly, 0 conflicts |
| 02 | `test-02-no-conflicts.csv` | Hill | None | Clean import, 10 data rows, no conflicts |
| 03 | `test-03-new-column.csv` | Hill | NEW | "Insurance Plan Type" unrecognized, 1 WARNING |
| 04 | `test-04-missing-required.csv` | Hill | MISSING | "Patient" column removed, BLOCKING (memberName required) |
| 05 | `test-05-changed-column.csv` | Hill | CHANGED | "Patient Full Name" fuzzy matches "Patient", BLOCKING |
| 06 | `test-06-duplicate-headers.csv` | Hill | DUPLICATE | "Member Name" appears twice, BLOCKING early return |
| 07 | `test-07-duplicate-fuzzy.csv` | Hill | DUPLICATE | "Patient Name" + "Member Full Name" both match "Patient" |
| 09 | `test-09-wrong-file.csv` | Hill | Wrong File | Employee data, 0% column match, `isWrongFile=true` |
| 10 | `test-10-mixed-conflicts.csv` | Hill | Mixed | NEW + CHANGED + MISSING in one file |
| 11 | `test-11-headers-only.csv` | Hill | Edge Case | Headers only, no data rows |
| 12 | `test-12-unicode-headers.csv` | Hill | Edge Case | Unicode/special characters in headers |
| 13 | `test-13-sutter-action-patterns.csv` | Sutter | Actions | All 10 regex patterns + fuzzy fallback + unmapped + AWV/APV/HCC |
| 15 | `test-15-abbreviations.csv` | Hill | Abbreviations | Headers using medical abbreviations (Ph, Addr, AWV, BP, etc.) |
| 16 | `test-16-realistic-hill-rename.csv` | Hill | CHANGED (realistic) | Real-world rename: "Eye Exam"->"Diabetic Eye Exam", "BP Control"->"Blood Pressure Control" |
| 17 | `test-17-xss-headers.csv` | Hill | XSS Security | Headers containing `<script>` and `<img onerror>` tags |
| 18 | `test-18-hill-format.csv` | Hill | CSV format | Same as test-01 but explicitly for CSV-specific parsing tests |
| 20 | `test-20-sutter-realistic-rename.csv` | Sutter | CHANGED (realistic) | Real-world rename: "Member Name"->"Patient Name", "Member DOB"->"Member Date of Birth" |

## Usage

### Manual Testing
1. Navigate to Import page
2. Select the target Healthcare System (Hill or Sutter as indicated above)
3. Upload the test file
4. Observe conflict detection behavior
5. Verify against expected outcome

### Automated Testing
These files are referenced in:
- `backend/src/services/import/__tests__/conflictDetector.test.ts`
- `backend/src/services/import/__tests__/fuzzyMatcher.test.ts`
- `frontend/e2e/smart-column-mapping.spec.ts`

## Test Scenarios Covered

### Fuzzy Matching (TC-FM-*)
- Exact match after normalization
- Case insensitivity
- Abbreviation expansion (32 medical abbreviations)
- Q1/Q2/E suffix stripping
- Threshold boundary (0.80)
- Top 3 results cap

### Conflict Detection (TC-CD-*)
- All 5 conflict types: NEW, MISSING, CHANGED, DUPLICATE, AMBIGUOUS
- All 3 severity levels: BLOCKING, WARNING, INFO
- Wrong file detection (< 10% match)
- Per-header fail-open error handling
- Mixed conflict scenarios

### Action Patterns (TC-AP-*)
- All 10 Sutter regex patterns
- AWV/APV/HCC direct request type mappings
- Unmapped action text aggregation
- Fuzzy fallback for action matching
- Year-pattern stripping

### Security (from QA Review)
- XSS injection in column headers (test-17)
- ReDoS pattern rejection (tested via API, no spreadsheet needed)
- SQL injection defense-in-depth (tested via API)

### Realistic Scenarios (from QA Review)
- Hill system with 2 renamed columns (test-16)
- Sutter system with renamed patient columns (test-20)
