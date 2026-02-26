/**
 * Parallel Editing - Remote Row Operations (Cypress)
 *
 * Tests AG Grid behavior when rows are added or deleted by other users
 * via Socket.IO events (row:created, row:deleted).
 */

describe('Parallel Editing - Row Operations', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.waitForAgGrid();
  });

  it('should display rows loaded from API', () => {
    // Verify grid has loaded data
    cy.get('.ag-row[row-index]').should('have.length.greaterThan', 0);
  });

  it('should handle row selection state correctly', () => {
    // Select first row
    cy.get('[row-index="0"]').first().click();
    cy.get('[row-index="0"]').first().should('have.class', 'ag-row-selected');

    // Click second row to change selection
    cy.get('[row-index="1"]').first().click();
    cy.get('[row-index="0"]').first().should('not.have.class', 'ag-row-selected');
    cy.get('[row-index="1"]').first().should('have.class', 'ag-row-selected');
  });

  it('should update row count after Add Row', () => {
    // Count initial rows
    cy.get('.ag-row[row-index]').then(($rows) => {
      const initialCount = $rows.length;

      // Click Add Row button
      cy.get('button').contains('Add Row').click();

      // Wait for modal to appear
      cy.get('input[placeholder="Enter patient name"]').should('be.visible');

      // Fill in the modal
      cy.get('input[placeholder="Enter patient name"]').type(`CypressTest ${Date.now()}`);
      cy.get('input[type="date"]').type('1990-01-01');

      // Submit
      cy.get('.bg-white.rounded-lg').find('button').contains('Add Row').click();

      // Wait for modal to close and grid to update
      cy.get('text=Add New Patient').should('not.exist', { timeout: 5000 });

      // Row count should increase (auto-retries)
      cy.get('.ag-row[row-index]').should('have.length.greaterThan', initialCount);
    });
  });

  it('should update row count after Delete Row', () => {
    // First add a row to delete
    cy.get('button').contains('Add Row').click();
    // Wait for modal to appear
    cy.get('input[placeholder="Enter patient name"]').should('be.visible');

    const testName = `DeleteTest ${Date.now()}`;
    cy.get('input[placeholder="Enter patient name"]').type(testName);
    cy.get('input[type="date"]').type('1990-01-01');
    cy.get('.bg-white.rounded-lg').find('button').contains('Add Row').click();
    cy.get('text=Add New Patient').should('not.exist', { timeout: 5000 });

    // Wait for grid to update with new row
    cy.get('.ag-row[row-index]').should('have.length.greaterThan', 0);

    // Count rows after adding
    cy.get('.ag-row[row-index]').then(($rows) => {
      const countAfterAdd = $rows.length;

      // Select the last row (our newly added row)
      cy.get(`[row-index="${countAfterAdd - 1}"]`).first().click();
      cy.get(`[row-index="${countAfterAdd - 1}"]`).first().should('have.class', 'ag-row-selected');

      // Click Delete Row
      cy.get('button').contains('Delete Row').click();

      // Confirm deletion if modal appears
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Delete")').length > 1) {
          cy.get('button').contains('Delete').last().click();
        }
      });

      // Row count should decrease (auto-retries)
      cy.get('.ag-row[row-index]').should('have.length.lessThan', countAfterAdd);
    });
  });
});
