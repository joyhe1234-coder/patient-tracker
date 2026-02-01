// Cypress E2E Support File
// This file is processed before each E2E test file

// Import commands
import './commands';

// Prevent TypeScript errors for Cypress global
declare global {
  namespace Cypress {
    interface Chainable {
      // AG Grid helpers
      getAgGridCell(rowIndex: number, colId: string): Chainable<JQuery<HTMLElement>>;
      getAgGridCellWithScroll(rowIndex: number, colId: string): Chainable<JQuery<HTMLElement>>;
      getAgGridCellByMemberName(memberName: string, colId: string): Chainable<JQuery<HTMLElement>>;
      selectAgGridDropdown(rowIndex: number, colId: string, value: string): Chainable<void>;
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
