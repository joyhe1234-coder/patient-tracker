# Test Plan: CSV/Excel Import Pipeline

## Coverage Matrix

### File Parsing
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Parse CSV | TC-14.2 | fileParser.test.ts (47 tests) | Covered |
| AC-2 | Parse Excel with title skip | TC-14.3 | fileParser.test.ts: Excel tests | Covered |
| AC-3 | Required column validation | TC-14.4 | fileParser.test.ts: column validation | Covered |
| AC-4 | File metadata display | TC-14.2 | import-flow.cy.ts: file upload tests | Covered |
| AC-5 | Reject unsupported types | TC-14.5 | import-flow.cy.ts: "Error Handling" (4 tests) | Covered |

### Column Mapping
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-6 | Patient column mapping | TC-15.1 | columnMapper.test.ts (28 tests) | Covered |
| AC-7 | Measure Q1/Q2 mapping | TC-15.2 | columnMapper.test.ts | Covered |
| AC-8 | Multiple columns → same measure | TC-15.6 | columnMapper.test.ts: grouping tests | Covered |
| AC-9 | Skip columns | TC-15.3 | columnMapper.test.ts: skip tests | Covered |
| AC-10 | Unmapped column warnings | TC-15.4 | columnMapper.test.ts | Covered |

### Data Transformation
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-11 | Wide to long format | TC-16.1 | dataTransformer.test.ts (34 tests) | Covered |
| AC-12 | Skip empty measures | TC-16.3 | dataTransformer.test.ts | Covered |
| AC-13 | statusDate = import date | TC-16.4 | dataTransformer.test.ts | Covered |
| AC-14 | Phone normalization | TC-16.6 | dataTransformer.test.ts | Covered |
| AC-15 | Multiple date formats | TC-17.1-17.7 | fileParser.test.ts: date parsing | Covered |
| AC-16 | Patients with no measures | TC-16.5 | dataTransformer.test.ts | Covered |

### Compliance Logic
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-17 | Any non-compliant wins | TC-18.2 | dataTransformer.test.ts | Covered |
| AC-18 | Compliant mapping | TC-18.1 | dataTransformer.test.ts | Covered |
| AC-19 | Non-compliant mapping | TC-18.3 | dataTransformer.test.ts | Covered |
| AC-20 | Case insensitive | TC-18.7-18.9 | dataTransformer.test.ts | Covered |
| AC-21 | All empty = skip | TC-18.6 | dataTransformer.test.ts | Covered |

### Validation
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-22 | Required fields | TC-19.1-19.6 | validator.test.ts (57 tests) | Covered |
| AC-23 | Data type validation | TC-19.3, 19.5, 19.7 | validator.test.ts | Covered |
| AC-24 | Duplicate in import | TC-19.10 | validator.test.ts | Covered |
| AC-25 | Error vs warning severity | TC-19.1-19.9 | validator.test.ts | Covered |
| AC-26 | Row number + member name | TC-20.1 | errorReporter.test.ts (48 tests) | Covered |
| AC-27 | Error deduplication | TC-21.11 | validator.test.ts | Covered |

### Error Reporting
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-28 | Error count display | TC-20.2 | import-flow.cy.ts: error tests | Covered |
| AC-29 | Warning count display | TC-20.3 | import-flow.cy.ts: warning tests | Covered |
| AC-30 | Duplicate groups display | TC-20.4 | - | Gap |
| AC-31 | Validation summary | TC-20.5-20.7 | ImportPage.test.tsx (30 tests) | Covered |
| AC-32 | canProceed flag | TC-20.8-20.9 | validator.test.ts | Covered |
| AC-33 | Row numbers match spreadsheet | TC-21.9-21.10 | validator.test.ts, errorReporter.test.ts | Covered |

### Preview
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-34 | Preview diff actions | TC-22.1-22.7 | diffCalculator.test.ts (104 tests), mergeLogic.test.ts (37 tests) | Covered |
| AC-35 | Merge mode logic | TC-22.2-22.7 | diffCalculator.test.ts | Covered |
| AC-36 | Replace mode | TC-22.8 | diffCalculator.test.ts: replace tests | Covered |
| AC-37 | Preview cache TTL | TC-22.11 | previewCache.test.ts (21 tests) | Covered |
| AC-38 | Action filter cards | TC-22.10 | import-flow.cy.ts: "Filter by action type" | Covered |
| AC-39 | Patient summary | TC-22.9 | ImportPreviewPage.test.tsx (27 tests) | Covered |

### Execution
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-40 | Execute from preview | TC-23.2-23.7 | importExecutor.test.ts (22 tests) | Covered |
| AC-41 | Transaction rollback | TC-23.8 | importExecutor.test.ts | Covered |
| AC-42 | Sync duplicate flags | TC-23.9 | importExecutor.test.ts | Covered |
| AC-43 | Preview deleted after | TC-23.10 | importExecutor.test.ts | Covered |
| AC-44 | Stats returned | TC-23.12 | importExecutor.test.ts | Covered |

### Import UI
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-45 | System selection | - | import-flow.cy.ts: "Hill Healthcare selected" | Covered |
| AC-46 | Mode selection | - | import-flow.cy.ts: mode tests | Covered |
| AC-47 | Drag-and-drop upload | - | ImportPage.test.tsx: file upload tests | Covered |
| AC-48 | Preview page | - | import-flow.cy.ts: preview tests (6) | Covered |
| AC-49 | Execute button | - | import-flow.cy.ts: execution tests (7) | Covered |
| AC-50 | Success screen | - | import-flow.cy.ts: "Success message" | Covered |
| AC-51 | Physician selection | - | ImportPage.test.tsx: physician dropdown | Covered |
| AC-52 | Reassignment warning | - | ImportPreviewPage.test.tsx: reassignment tests, reassignment.test.ts (19 tests) | Covered |

## Automated Test Inventory
- Jest: fileParser.test.ts (47), columnMapper.test.ts (28), dataTransformer.test.ts (34), validator.test.ts (57), configLoader.test.ts (23), errorReporter.test.ts (48), diffCalculator.test.ts (104), previewCache.test.ts (21), importExecutor.test.ts (22), mergeLogic.test.ts (37), reassignment.test.ts (19), integration.test.ts (22)
- Vitest: ImportPage.test.tsx (30), ImportPreviewPage.test.tsx (27)
- Cypress: import-flow.cy.ts (57 tests)
- Total: ~499 import-related tests

## Gaps & Recommendations
- Gap 1: Duplicate groups UI display (AC-30) not E2E tested - Priority: LOW
- Note: Import pipeline has EXCELLENT test coverage (one of the best-tested features)
