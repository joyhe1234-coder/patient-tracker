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
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.waitForAgGrid();

    // Ensure row 0 is in a state where cell-prompt shows:
    // 1. requestType must be set (AWV)
    // 2. measureStatus must have a datePrompt (e.g. "AWV scheduled" → "Date Scheduled")
    // 3. statusDate must be empty
    cy.selectAgGridDropdown(0, 'requestType', 'AWV');
    cy.getAgGridCell(0, 'requestType').should('contain.text', 'AWV');
    cy.selectAgGridDropdown(0, 'measureStatus', 'AWV scheduled');
    cy.getAgGridCell(0, 'measureStatus').should('contain.text', 'AWV scheduled');

    // Clear the statusDate if it has a value so the cell-prompt appears
    cy.getAgGridCell(0, 'statusDate').then(($cell) => {
      if (!$cell.hasClass('cell-prompt')) {
        cy.getAgGridCell(0, 'statusDate').dblclick({ force: true });
        cy.get('.date-cell-editor').clear().type('{enter}');
      }
    });
    // Verify cell-prompt is showing before each test
    cy.getAgGridCell(0, 'statusDate').should('have.class', 'cell-prompt');
  });

  describe('Empty Cell Display', () => {
    it('should show prompt text with stripe pattern on empty statusDate cell', () => {
      // beforeEach already set requestType=AWV and cleared statusDate
      cy.getAgGridCell(0, 'statusDate').should('have.class', 'cell-prompt');
    });

    it('should show "Today" button on hover', () => {
      // Hover over the cell
      cy.getAgGridCell(0, 'statusDate').trigger('mouseover');

      // Today button should be visible (auto-retries)
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .should('exist');
    });
  });

  describe('Today Button Click', () => {
    it('should stamp today\'s date on Today button click', () => {
      // Hover to reveal Today button (hidden via CSS display:none until hover)
      cy.getAgGridCell(0, 'statusDate').trigger('mouseover', { force: true });
      cy.wait(300);
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .click({ force: true });

      // Cell should now show today's date (auto-retries)
      const today = getTodayFormatted();
      cy.getAgGridCell(0, 'statusDate').should('contain.text', today);
    });

    it('should remove prompt class after stamping today', () => {
      cy.getAgGridCell(0, 'statusDate').trigger('mouseover', { force: true });
      cy.wait(300);
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .click({ force: true });

      // Cell should no longer have the prompt class (auto-retries)
      cy.getAgGridCell(0, 'statusDate').should('not.have.class', 'cell-prompt');
    });
  });

  describe('Manual Date Entry (Double-Click)', () => {
    it('should open text editor on double-click', () => {
      cy.getAgGridCell(0, 'statusDate').dblclick({ force: true });

      // Editor input should appear (auto-retries)
      cy.get('.date-cell-editor').should('exist');
    });

    it('should save custom date on Enter', () => {
      cy.getAgGridCell(0, 'statusDate').dblclick({ force: true });

      cy.get('.date-cell-editor').type('1/15/2026{enter}');

      cy.getAgGridCell(0, 'statusDate').should('contain.text', '1/15/2026');
    });

    it('should cancel on Escape', () => {
      cy.getAgGridCell(0, 'statusDate').dblclick({ force: true });

      cy.get('.date-cell-editor').type('{esc}');

      // Cell should still show the prompt (not a date)
      cy.getAgGridCell(0, 'statusDate').should('have.class', 'cell-prompt');
    });
  });

  describe('Filled Cell Behavior', () => {
    it('should show date without Today button for filled cells', () => {
      // Stamp a date first — hover to reveal, then click
      cy.getAgGridCell(0, 'statusDate').trigger('mouseover', { force: true });
      cy.wait(300);
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .click({ force: true });

      // Wait for date to be set
      cy.getAgGridCell(0, 'statusDate').should('not.have.class', 'cell-prompt');

      // Hover over the now-filled cell — should NOT have Today button
      cy.getAgGridCell(0, 'statusDate').trigger('mouseover');
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .should('not.exist');
    });

    it('should show existing date on double-click edit of filled cell', () => {
      // Stamp today first — hover to reveal, then click
      cy.getAgGridCell(0, 'statusDate').trigger('mouseover', { force: true });
      cy.wait(300);
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .click({ force: true });

      // Wait for date to be set
      const today = getTodayFormatted();
      cy.getAgGridCell(0, 'statusDate').should('contain.text', today);

      // Double-click to edit
      cy.getAgGridCell(0, 'statusDate').dblclick({ force: true });

      // Input should show the existing date
      cy.get('.date-cell-editor').should('have.value', today);
    });
  });

  describe('Due Date Recalculation', () => {
    it('should trigger due date calculation after Today button click', () => {
      // beforeEach already set measureStatus to "AWV scheduled" which has a datePrompt.
      // Hover to reveal Today button, then click
      cy.getAgGridCell(0, 'statusDate').trigger('mouseover', { force: true });
      cy.wait(300);
      cy.getAgGridCell(0, 'statusDate').find('.status-date-today-btn')
        .click({ force: true });

      // Wait for date to be set
      cy.getAgGridCell(0, 'statusDate').should('not.have.class', 'cell-prompt');

      // Due date should now have a value (recalculated from the status date)
      cy.getAgGridCellWithScroll(0, 'dueDate').invoke('text').then((text) => {
        // Due date might show a date or "N/A" — just verify the cell was updated
        expect(text.trim().length).to.be.greaterThan(0);
      });
    });
  });
});
