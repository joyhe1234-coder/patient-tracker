// AG Grid Cypress Commands
// Custom commands for interacting with AG Grid dropdowns

/**
 * Login and navigate to the main page.
 * Handles both fresh and already-authenticated states.
 */
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible').type(email);
    cy.get('input[type="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 15000 });
  });
});

/**
 * Wait for AG Grid to be fully loaded and API to be available
 */
Cypress.Commands.add('waitForAgGrid', () => {
  cy.get('.ag-theme-alpine', { timeout: 15000 }).should('be.visible');
  cy.get('.ag-row[row-index]', { timeout: 10000 }).should('exist');
  // Wait for grid API to be exposed (needed for reliable dropdown interactions)
  cy.window().should('have.property', '__agGridApi');
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
 * Uses single click — AutoOpenSelectEditor opens immediately as a popup
 */
Cypress.Commands.add('openAgGridDropdown', (rowIndex: number, colId: string) => {
  const cellSelector = `[row-index="${rowIndex}"] [col-id="${colId}"]`;

  // Single click opens the auto-open dropdown editor
  cy.get(cellSelector).first().click();
  cy.wait(300);

  // Wait for dropdown popup to appear
  cy.get('.ag-popup', { timeout: 5000 }).should('be.visible');

  return cy.get(cellSelector).first();
});

/**
 * Get all options from the currently open dropdown
 * Supports both AutoOpenSelectEditor (.auto-open-select-option) and legacy AG Grid selectors
 */
Cypress.Commands.add('getAgGridDropdownOptions', () => {
  return cy.get('.ag-popup .auto-open-select-option, .ag-popup .ag-list-item, .ag-popup .ag-select-list-item, .ag-popup [role="option"], [role="listbox"] [role="option"]')
    .then(($items) => {
      const options: string[] = [];
      $items.each((_, el) => {
        // Strip checkmark prefix (✓) that AutoOpenSelectEditor adds for the selected value
        options.push(Cypress.$(el).text().replace(/✓\s*/g, '').trim());
      });
      return cy.wrap(options);
    });
});

/**
 * Select a value from an AG Grid dropdown by row index.
 * Uses gridApi.startEditingCell() directly (exposed via window.__agGridApi)
 * for reliable popup opening — bypasses click timing issues entirely.
 */
Cypress.Commands.add('selectAgGridDropdown', (rowIndex: number, colId: string, value: string) => {
  // Ensure any previous popup/editor is closed
  cy.get('body').type('{esc}');
  cy.wait(200);

  // Use the grid API to programmatically start editing the cell
  cy.window().then((win) => {
    const api = (win as any).__agGridApi;
    if (api) {
      api.startEditingCell({ rowIndex, colKey: colId });
    } else {
      // Fallback: click the cell if API not available
      cy.get(`[row-index="${rowIndex}"] [col-id="${colId}"]`).first().click();
    }
  });

  // Wait for popup to be visible and have items
  cy.get('.ag-popup', { timeout: 10000 }).should('be.visible');
  cy.get('.ag-popup .auto-open-select-option, .ag-popup .ag-list-item, .ag-popup .ag-select-list-item, .ag-popup [role="option"]', { timeout: 5000 })
    .should('have.length.greaterThan', 0);

  // Find and click the option with matching text
  cy.get('.ag-popup .auto-open-select-option, .ag-popup .ag-list-item, .ag-popup .ag-select-list-item, .ag-popup [role="option"]')
    .contains(value)
    .click({ force: true });

  // Wait for dropdown to close and value to be saved
  cy.wait(300);
});

/**
 * Select an AG Grid dropdown value with retry on 409/conflict failures.
 * After selecting, verifies the cell contains the value. If it doesn't
 * (e.g., due to a version conflict 409), waits and retries up to maxRetries times.
 */
Cypress.Commands.add('selectAgGridDropdownAndVerify', (rowIndex: number, colId: string, value: string, maxRetries = 2) => {
  const attempt = (retriesLeft: number) => {
    cy.selectAgGridDropdown(rowIndex, colId, value);
    cy.wait(500);
    cy.getAgGridCell(rowIndex, colId).invoke('text').then((rawText) => {
      const text = rawText.replace(/[✓▾]/g, '').trim();
      if (text.includes(value)) {
        // Selection succeeded
        return;
      }
      if (retriesLeft > 0) {
        cy.log(`selectAgGridDropdownAndVerify: "${colId}" shows "${text}", expected "${value}". Retrying... (${retriesLeft} left)`);
        cy.wait(2000); // Wait for any pending saves/version updates
        attempt(retriesLeft - 1);
      } else {
        // Final assertion — will fail with a clear message
        cy.getAgGridCell(rowIndex, colId).should('contain.text', value);
      }
    });
  };
  attempt(maxRetries);
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
 * Scroll to a column in AG Grid to ensure it's visible
 */
Cypress.Commands.add('scrollToAgGridColumn', (colId: string) => {
  // Scroll the center cols viewport to reveal more columns
  cy.get('.ag-center-cols-viewport').then(($viewport) => {
    const el = $viewport[0];
    el.scrollLeft = el.scrollWidth;
    el.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  cy.wait(400);
});

/**
 * Get an AG Grid cell by row index and column ID, ensuring the column is visible.
 * Scrolls the AG Grid center column viewport to reveal virtually-rendered columns.
 */
Cypress.Commands.add('getAgGridCellWithScroll', (rowIndex: number, colId: string) => {
  // Scroll the center cols viewport (the actual scrollable container for non-pinned columns)
  cy.get('.ag-center-cols-viewport').then(($viewport) => {
    const el = $viewport[0];
    el.scrollLeft = el.scrollWidth;
    // Dispatch scroll event so AG Grid processes the scroll and re-renders virtual columns
    el.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  cy.wait(600);
  // Then get the cell
  return cy.get(`[row-index="${rowIndex}"] [col-id="${colId}"]`, { timeout: 10000 }).first();
});

/**
 * Add a test row via the Add Row modal
 */
Cypress.Commands.add('addTestRow', (name: string) => {
  // Click Add Row button
  cy.contains('button', 'Add Row').click();

  // Wait for modal — split name fields (Last Name, First Name)
  cy.get('input[placeholder="Last name"]', { timeout: 5000 }).should('be.visible');

  // Parse "Last, First" or treat entire string as last name
  const commaIndex = name.indexOf(',');
  const lastName = commaIndex >= 0 ? name.substring(0, commaIndex).trim() : name;
  const firstName = commaIndex >= 0 ? name.substring(commaIndex + 1).trim() : 'Test';

  // Fill in the form
  cy.get('input[placeholder="Last name"]').type(lastName);
  cy.get('input[placeholder="First name"]').type(firstName);
  cy.get('input[type="date"]').type('1990-01-01');

  // Submit
  cy.get('.bg-white.rounded-lg.shadow-xl').contains('button', 'Add Row').click();

  // Wait for modal to close
  cy.contains('Add New Patient').should('not.exist');
  cy.wait(500);
});
