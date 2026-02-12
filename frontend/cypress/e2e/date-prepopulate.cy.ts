/**
 * Date Prepopulate E2E Tests — Cypress
 *
 * Tests the Option A "Today" button on statusDate cells:
 * - Empty cells show striped prompt with hover-reveal "Today" button
 * - Clicking "Today" stamps today's date in one click
 * - Double-click opens manual text editor for custom date
 * - Filled cells show date normally (no "Today" button)
 * - Escape cancels manual editing
 */

describe('Date Prepopulate — Today Button (Option A)', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  const getTodayFormatted = (): string => {
    const now = new Date();
    return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  };

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
    cy.visit('/');
    cy.waitForAgGrid();
  });

  describe('Empty Cell Display', () => {
    it('should show prompt text with stripe pattern on empty statusDate cell', () => {
      // Set up a row so statusDate prompt appears
      cy.selectAgGridDropdown(0, 'requestType', 'AWV');
      cy.wait(500);

      // Cell should have the prompt class (stripe pattern)
      cy.getAgGridCell(0, 'statusDate').should('have.class', 'cell-prompt');
    });

    it('should show "Today" button on hover', () => {
      cy.selectAgGridDropdown(0, 'requestType', 'AWV');
      cy.wait(500);

      // Hover over the cell
      cy.getAgGridCell(0, 'statusDate').trigger('mouseover');
      cy.wait(200);

      // Today button should be visible
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .should('exist');
    });
  });

  describe('Today Button Click', () => {
    it('should stamp today\'s date on Today button click', () => {
      cy.selectAgGridDropdown(0, 'requestType', 'AWV');
      cy.wait(500);

      // Click the Today button
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .click({ force: true });
      cy.wait(500);

      // Cell should now show today's date
      const today = getTodayFormatted();
      cy.getAgGridCell(0, 'statusDate').should('contain.text', today);
    });

    it('should remove prompt class after stamping today', () => {
      cy.selectAgGridDropdown(0, 'requestType', 'AWV');
      cy.wait(500);

      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .click({ force: true });
      cy.wait(500);

      // Cell should no longer have the prompt class
      cy.getAgGridCell(0, 'statusDate').should('not.have.class', 'cell-prompt');
    });
  });

  describe('Manual Date Entry (Double-Click)', () => {
    it('should open text editor on double-click', () => {
      cy.selectAgGridDropdown(0, 'requestType', 'AWV');
      cy.wait(500);

      cy.getAgGridCell(0, 'statusDate').dblclick();
      cy.wait(200);

      // Editor input should appear
      cy.get('.date-cell-editor').should('exist');
    });

    it('should save custom date on Enter', () => {
      cy.selectAgGridDropdown(0, 'requestType', 'AWV');
      cy.wait(500);

      cy.getAgGridCell(0, 'statusDate').dblclick();
      cy.wait(200);

      cy.get('.date-cell-editor').type('1/15/2026{enter}');
      cy.wait(500);

      cy.getAgGridCell(0, 'statusDate').should('contain.text', '1/15/2026');
    });

    it('should cancel on Escape', () => {
      cy.selectAgGridDropdown(0, 'requestType', 'AWV');
      cy.wait(500);

      cy.getAgGridCell(0, 'statusDate').dblclick();
      cy.wait(200);

      cy.get('.date-cell-editor').type('{esc}');
      cy.wait(300);

      // Cell should still show the prompt (not a date)
      cy.getAgGridCell(0, 'statusDate').should('have.class', 'cell-prompt');
    });
  });

  describe('Filled Cell Behavior', () => {
    it('should show date without Today button for filled cells', () => {
      // First stamp a date
      cy.selectAgGridDropdown(0, 'requestType', 'AWV');
      cy.wait(500);
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .click({ force: true });
      cy.wait(500);

      // Hover over the now-filled cell — should NOT have Today button
      cy.getAgGridCell(0, 'statusDate').trigger('mouseover');
      cy.wait(200);
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .should('not.exist');
    });

    it('should show existing date on double-click edit of filled cell', () => {
      // Stamp today first
      cy.selectAgGridDropdown(0, 'requestType', 'AWV');
      cy.wait(500);
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .click({ force: true });
      cy.wait(500);

      // Double-click to edit
      cy.getAgGridCell(0, 'statusDate').dblclick();
      cy.wait(200);

      // Input should show the existing date
      const today = getTodayFormatted();
      cy.get('.date-cell-editor').should('have.value', today);
    });
  });

  describe('Due Date Recalculation', () => {
    it('should trigger due date calculation after Today button click', () => {
      cy.selectAgGridDropdown(0, 'requestType', 'AWV');
      cy.wait(500);
      cy.selectAgGridDropdown(0, 'measureStatus', 'Scheduled');
      cy.wait(500);

      // Click Today to stamp date
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .click({ force: true });
      cy.wait(1000);

      // Due date should now have a value
      cy.getAgGridCellWithScroll(0, 'dueDate').should('not.have.text', '');
    });
  });
});
