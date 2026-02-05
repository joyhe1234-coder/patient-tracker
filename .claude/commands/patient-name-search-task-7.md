# Task 7: Update documentation for Patient Name Search

## Spec Reference
- Spec: `.claude/specs/patient-name-search/`
- Requirements: All

## Instructions

Update the following documentation files:

### 1. `.claude/CHANGELOG.md`
Add entry at top:
```markdown
### [Date] - Patient Name Search
- **Added**: Search input in StatusFilterBar for filtering patients by name
- **Added**: Case-insensitive partial match filtering on memberName
- **Added**: AND logic between name search and status color filter
- **Added**: Ctrl+F keyboard shortcut to focus search, Escape to clear
- **Added**: Vitest component tests for search UI (StatusFilterBar.test.tsx)
- **Added**: Vitest tests for search filtering logic (MainPage.test.tsx)
- **Added**: Cypress E2E tests for search (patient-name-search.cy.ts)
```

### 2. `.claude/TODO.md`
- Mark `[ ] Quick search/filter by patient name` as `[x]` (in Phase 4: Sorting & Filtering)
- Update "Last Updated" date

### 3. `.claude/IMPLEMENTATION_STATUS.md`
- Add Patient Name Search to completed features
- Update test counts (Vitest, Cypress)

### 4. `.claude/REGRESSION_TEST_PLAN.md`
- Add new test section for Patient Name Search (TC-XX)
- Include test cases: search input renders, filtering works, AND logic, keyboard shortcuts, clear button

### 5. `.claude/TESTING.md`
- Add new test files to test inventory
- Update test counts

## Acceptance Criteria
- All documentation files updated and consistent with each other
- CHANGELOG reflects actual changes made
- TODO marks quick search as complete
- Test counts accurate
