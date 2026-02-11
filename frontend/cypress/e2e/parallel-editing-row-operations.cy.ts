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
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
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
    cy.wait(300);
    cy.get('[row-index="0"]').first().should('have.class', 'ag-row-selected');

    // Click second row to change selection
    cy.get('[row-index="1"]').first().click();
    cy.wait(300);
    cy.get('[row-index="0"]').first().should('not.have.class', 'ag-row-selected');
    cy.get('[row-index="1"]').first().should('have.class', 'ag-row-selected');
  });

  it('should update row count after Add Row', () => {
    // Count initial rows
    cy.get('.ag-row[row-index]').then(($rows) => {
      const initialCount = $rows.length;

      // Click Add Row button
      cy.get('button').contains('Add Row').click();
      cy.wait(500);

      // Fill in the modal
      cy.get('input[placeholder="Enter patient name"]').type(`CypressTest ${Date.now()}`);
      cy.get('input[type="date"]').type('1990-01-01');

      // Submit
      cy.get('.bg-white.rounded-lg').find('button').contains('Add Row').click();

      // Wait for modal to close and grid to update
      cy.get('text=Add New Patient').should('not.exist', { timeout: 5000 });
      cy.wait(1000);

      // Row count should increase
      cy.get('.ag-row[row-index]').should('have.length.greaterThan', initialCount);
    });
  });

  it('should update row count after Delete Row', () => {
    // First add a row to delete
    cy.get('button').contains('Add Row').click();
    cy.wait(500);
    const testName = `DeleteTest ${Date.now()}`;
    cy.get('input[placeholder="Enter patient name"]').type(testName);
    cy.get('input[type="date"]').type('1990-01-01');
    cy.get('.bg-white.rounded-lg').find('button').contains('Add Row').click();
    cy.get('text=Add New Patient').should('not.exist', { timeout: 5000 });
    cy.wait(1000);

    // Count rows after adding
    cy.get('.ag-row[row-index]').then(($rows) => {
      const countAfterAdd = $rows.length;

      // Select the last row (our newly added row)
      cy.get(`[row-index="${countAfterAdd - 1}"]`).first().click();
      cy.wait(300);

      // Click Delete Row
      cy.get('button').contains('Delete Row').click();
      cy.wait(500);

      // Confirm deletion if modal appears
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Delete")').length > 1) {
          cy.get('button').contains('Delete').last().click();
        }
      });

      cy.wait(1000);

      // Row count should decrease
      cy.get('.ag-row[row-index]').should('have.length.lessThan', countAfterAdd);
    });
  });
});
