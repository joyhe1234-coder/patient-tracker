// AG Grid Cypress Commands
// Custom commands for interacting with AG Grid dropdowns

/**
 * Wait for AG Grid to be fully loaded
 */
Cypress.Commands.add('waitForAgGrid', () => {
  cy.get('.ag-theme-alpine', { timeout: 10000 }).should('be.visible');
  cy.get('.ag-row[row-index]', { timeout: 5000 }).should('exist');
});

/**
 * Get an AG Grid cell by row index and column ID
 */
Cypress.Commands.add('getAgGridCell', (rowIndex: number, colId: string) => {
  return cy.get(`[row-index="${rowIndex}"] [col-id="${colId}"]`).first();
});

/**
 * Find the row index for a member by name
 */
Cypress.Commands.add('findRowByMemberName', (memberName: string) => {
  return cy.get('[col-id="memberName"]').then(($cells) => {
    for (let i = 0; i < $cells.length; i++) {
      const cellText = $cells.eq(i).text();
      if (cellText.includes(memberName)) {
        const row = $cells.eq(i).closest('[row-index]');
        const rowIndex = row.attr('row-index');
        return cy.wrap(parseInt(rowIndex || '-1'));
      }
    }
    return cy.wrap(-1);
  });
});

/**
 * Get an AG Grid cell by member name and column ID
 */
Cypress.Commands.add('getAgGridCellByMemberName', (memberName: string, colId: string) => {
  // Find the memberName cell first (it's always rendered since it's in pinned left)
  return cy.get('[col-id="memberName"]').contains(memberName).then(($memberCell) => {
    // Get the row element
    const $row = $memberCell.closest('[row-index]');
    const rowIndex = $row.attr('row-index');

    // Scroll the memberName cell into view (this scrolls the whole row in AG Grid)
    $memberCell[0].scrollIntoView({ block: 'center', behavior: 'instant' });

    // Wait for AG Grid to potentially re-render
    cy.wait(400);

    // Now get the cell in the target column - it should be in the same row
    // Use should('exist') to wait for virtual DOM to render
    return cy.get(`[row-index="${rowIndex}"] [col-id="${colId}"]`, { timeout: 10000 })
      .should('exist')
      .first();
  });
});

/**
 * Open an AG Grid dropdown cell for editing
 */
Cypress.Commands.add('openAgGridDropdown', (rowIndex: number, colId: string) => {
  const cellSelector = `[row-index="${rowIndex}"] [col-id="${colId}"]`;

  // Double-click to enter edit mode
  cy.get(cellSelector).first().dblclick();
  cy.wait(200);

  // Click on the dropdown wrapper to open the list (AG Grid needs this extra click)
  cy.get(cellSelector).first().find('.ag-cell-edit-wrapper, .ag-select, .ag-wrapper, .ag-picker-field-wrapper').first()
    .click({ force: true });
  cy.wait(300);

  // If popup still not visible, try pressing Space or click again
  cy.get('body').then(($body) => {
    if ($body.find('.ag-popup').length === 0) {
      cy.get(cellSelector).first().click();
      cy.wait(200);
    }
  });

  // Wait for dropdown popup to appear
  cy.get('.ag-popup', { timeout: 5000 }).should('be.visible');

  return cy.get(cellSelector).first();
});

/**
 * Get all options from the currently open dropdown
 */
Cypress.Commands.add('getAgGridDropdownOptions', () => {
  return cy.get('.ag-popup .ag-list-item, .ag-popup .ag-select-list-item, .ag-popup [role="option"], [role="listbox"] [role="option"]')
    .then(($items) => {
      const options: string[] = [];
      $items.each((_, el) => {
        options.push(Cypress.$(el).text().trim());
      });
      return cy.wrap(options);
    });
});

/**
 * Select a value from an AG Grid dropdown by row index
 */
Cypress.Commands.add('selectAgGridDropdown', (rowIndex: number, colId: string, value: string) => {
  const cellSelector = `[row-index="${rowIndex}"] [col-id="${colId}"]`;

  // Double-click to enter edit mode
  cy.get(cellSelector).first().dblclick();
  cy.wait(200);

  // Click on the dropdown wrapper to open the list (AG Grid needs this extra click)
  cy.get(cellSelector).first().find('.ag-cell-edit-wrapper, .ag-select, .ag-wrapper, .ag-picker-field-wrapper').first()
    .click({ force: true });
  cy.wait(300);

  // If popup still not visible, try clicking the cell again
  cy.get('body').then(($body) => {
    if ($body.find('.ag-popup').length === 0) {
      cy.get(cellSelector).first().click();
      cy.wait(200);
    }
  });

  // Wait for popup to be visible and have items
  cy.get('.ag-popup', { timeout: 5000 }).should('be.visible');
  cy.get('.ag-popup .ag-list-item, .ag-popup .ag-select-list-item, .ag-popup [role="option"]', { timeout: 3000 })
    .should('have.length.greaterThan', 0);

  // Find and click the option with matching text
  cy.get('.ag-popup .ag-list-item, .ag-popup .ag-select-list-item, .ag-popup [role="option"]')
    .contains(value)
    .click({ force: true });

  // Wait for dropdown to close and value to be set
  cy.wait(300);
});

/**
 * Select a value from an AG Grid dropdown by member name
 */
Cypress.Commands.add('selectAgGridDropdownByMemberName', (memberName: string, colId: string, value: string) => {
  // Find the memberName cell first and scroll into view
  cy.get('[col-id="memberName"]').contains(memberName).then(($memberCell) => {
    const $row = $memberCell.closest('[row-index]');
    $row[0].scrollIntoView({ block: 'center' });
    cy.wait(200);

    const rowIndex = parseInt($row.attr('row-index') || '-1');
    if (rowIndex < 0) {
      throw new Error(`Could not find row for member: ${memberName}`);
    }
    cy.selectAgGridDropdown(rowIndex, colId, value);
  });
});

/**
 * Add a test row via the Add Row modal
 */
Cypress.Commands.add('addTestRow', (name: string) => {
  // Click Add Row button
  cy.contains('button', 'Add Row').click();

  // Wait for modal
  cy.get('input[placeholder="Enter patient name"]', { timeout: 5000 }).should('be.visible');

  // Fill in the form
  cy.get('input[placeholder="Enter patient name"]').type(name);
  cy.get('input[type="date"]').type('1990-01-01');

  // Submit
  cy.get('.bg-white.rounded-lg.shadow-xl').contains('button', 'Add Row').click();

  // Wait for modal to close
  cy.contains('Add New Patient').should('not.exist');
  cy.wait(500);
});
