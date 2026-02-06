# Task 6: Write Cypress E2E tests for search functionality

## Spec Reference
- Spec: `.claude/specs/patient-name-search/`
- Requirements: All (1-5)

## Instructions

Create `frontend/cypress/e2e/patient-name-search.cy.ts`:

1. **Setup**: Use existing Cypress patterns - visit page, wait for AG Grid to load
   ```typescript
   describe('Patient Name Search', () => {
     beforeEach(() => {
       cy.loginAsAdmin();  // or appropriate login command
       cy.visit('/');
       cy.waitForAgGrid();
     });
   });
   ```

2. **Test Cases**:

   **Search Input UI:**
   - Search input is visible with placeholder "Search by name..."
   - Search icon is visible

   **Filtering Behavior:**
   - Typing a known patient name filters grid to show matching rows
   - Search is case-insensitive (type lowercase, match mixed case)
   - Partial match works (type first few chars of a name)
   - No matches shows empty grid (type a string that doesn't match any patient)

   **Clear Behavior:**
   - Clear button appears when text is typed
   - Clicking clear button restores all rows
   - Clear button disappears after clearing

   **Filter Combination:**
   - Select a status color filter, then search by name → only rows matching BOTH
   - Clear search while status filter active → shows all rows for that status

   **Keyboard Shortcuts:**
   - Ctrl+F focuses the search input
   - Escape clears search and removes focus

3. **Assertions**: Use row count assertions and AG Grid cell content checks

4. **Run**: `cd frontend && npx cypress run --spec cypress/e2e/patient-name-search.cy.ts`

## Leverage
- Cypress patterns: `frontend/cypress/e2e/sorting-filtering.cy.ts`
- Custom commands: `frontend/cypress/support/commands.ts` (waitForAgGrid, loginAsAdmin, etc.)

## Acceptance Criteria
- All tests pass
- At least 10 test cases covering all 5 requirements
- Tests run reliably in CI (no flaky tests)
