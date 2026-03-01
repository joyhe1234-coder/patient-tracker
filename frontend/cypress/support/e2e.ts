// Cypress E2E Support File
// This file is processed before each E2E test file

// Import commands
import './commands';

// Don't fail tests on uncaught exceptions (e.g. from conflict handling)
Cypress.on('uncaught:exception', () => {
  return true;
});

// Prevent TypeScript errors for Cypress global
declare global {
  namespace Cypress {
    interface Chainable {
      // Auth
      login(email: string, password: string): Chainable<void>;
      // AG Grid helpers
      getAgGridCell(rowIndex: number, colId: string): Chainable<JQuery<HTMLElement>>;
      getAgGridCellWithScroll(rowIndex: number, colId: string): Chainable<JQuery<HTMLElement>>;
      getAgGridCellByMemberName(memberName: string, colId: string): Chainable<JQuery<HTMLElement>>;
      selectAgGridDropdown(rowIndex: number, colId: string, value: string): Chainable<void>;
      selectAgGridDropdownAndVerify(rowIndex: number, colId: string, value: string, maxRetries?: number): Chainable<void>;
      selectAgGridDropdownByMemberName(memberName: string, colId: string, value: string): Chainable<void>;
      openAgGridDropdown(rowIndex: number, colId: string): Chainable<JQuery<HTMLElement>>;
      getAgGridDropdownOptions(): Chainable<string[]>;
      waitForAgGrid(): Chainable<void>;
      addTestRow(name: string): Chainable<void>;
      findRowByMemberName(memberName: string): Chainable<number>;
      scrollToAgGridColumn(colId: string): Chainable<void>;
    }
  }
}
