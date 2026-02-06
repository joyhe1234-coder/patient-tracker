/**
 * Cell Editing E2E Tests - Cypress
 *
 * Tests cell editing functionality in the AG Grid patient tracker:
 * - Row selection behavior
 * - Text cell editing (Notes column)
 * - Date cell editing (Status Date)
 * - Member Name editing
 * - Save indicator lifecycle
 */

describe('Cell Editing', () => {
  const adminEmail = 'admin2@gmail.com';
  const adminPassword = 'welcome100';
  const testRowIndex = 0;

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
    cy.visit('/');
    cy.waitForAgGrid();
  });

  describe('Row Selection', () => {
    it('should show selection outline when clicking a row', () => {
      cy.get(`[row-index="${testRowIndex}"]`).first().click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'ag-row-selected');
    });

    it('should change selection when clicking a different row', () => {
      // Click first row
      cy.get(`[row-index="${testRowIndex}"]`).first().click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'ag-row-selected');

      // Click second row
      cy.get('[row-index="1"]').first().click();
      cy.wait(300);

      // First row should no longer be selected
      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('not.have.class', 'ag-row-selected');

      // Second row should be selected
      cy.get('[row-index="1"]').first()
        .should('have.class', 'ag-row-selected');
    });

    it('should preserve row status color when row is selected', () => {
      // Set a row to a green status to ensure it has color
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'AWV completed');
      cy.wait(500);

      // Verify green class is applied
      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-green');

      // Click the row to select it
      cy.get(`[row-index="${testRowIndex}"]`).first().click();
      cy.wait(300);

      // Row should still have both selected and green classes
      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'ag-row-selected')
        .and('have.class', 'row-status-green');
    });
  });

  describe('Text Cell Editing (Notes)', () => {
    const testNote = `Test note ${Date.now()}`;

    it('should enter edit mode on single click of Notes cell', () => {
      cy.getAgGridCell(testRowIndex, 'notes').click();
      cy.wait(300);

      // Should show an input or textarea in edit mode
      cy.get(`[row-index="${testRowIndex}"] [col-id="notes"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-cell-edit-wrapper textarea, .ag-text-field-input')
        .should('exist');
    });

    it('should save text when clicking elsewhere', () => {
      // Click Notes cell to enter edit mode
      cy.getAgGridCell(testRowIndex, 'notes').click();
      cy.wait(300);

      // Clear existing text and type new note
      cy.get(`[row-index="${testRowIndex}"] [col-id="notes"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type(testNote);

      // Click elsewhere (on the header) to trigger save via stopEditingWhenCellsLoseFocus
      cy.get('.ag-header').click();
      cy.wait(500);

      // Verify the text was saved
      cy.getAgGridCell(testRowIndex, 'notes')
        .should('contain.text', testNote);
    });

    it('should save text when pressing Tab', () => {
      const tabNote = `Tab note ${Date.now()}`;

      // Click Notes cell to enter edit mode
      cy.getAgGridCell(testRowIndex, 'notes').click();
      cy.wait(300);

      // Clear and type new note, then press Tab
      cy.get(`[row-index="${testRowIndex}"] [col-id="notes"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type(tabNote)
        .type('{tab}');

      cy.wait(500);

      // Verify the text was saved
      cy.getAgGridCell(testRowIndex, 'notes')
        .should('contain.text', tabNote);
    });

    it('should persist saved text after exiting edit mode', () => {
      const persistNote = `Persist note ${Date.now()}`;

      // Enter edit mode and type
      cy.getAgGridCell(testRowIndex, 'notes').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="notes"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type(persistNote)
        .type('{enter}');

      cy.wait(500);

      // Verify text shows in cell
      cy.getAgGridCell(testRowIndex, 'notes')
        .should('contain.text', persistNote);

      // Click on a different cell to fully deselect
      cy.getAgGridCell(testRowIndex, 'requestType').click();
      cy.wait(300);

      // Escape any edit mode
      cy.get('body').type('{escape}');
      cy.wait(300);

      // Text should still be there
      cy.getAgGridCell(testRowIndex, 'notes')
        .should('contain.text', persistNote);
    });

    it('should show save indicator in toolbar after editing', () => {
      // Edit a notes cell
      cy.getAgGridCell(testRowIndex, 'notes').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="notes"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type(`Save indicator test ${Date.now()}`)
        .type('{enter}');

      // Should show "Saving..." in toolbar
      cy.contains('Saving...').should('be.visible');
    });
  });

  describe('Date Cell Editing (Status Date)', () => {
    it('should accept MM/DD/YYYY format', () => {
      cy.getAgGridCell(testRowIndex, 'statusDate').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="statusDate"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type('01/15/2025')
        .type('{enter}');

      cy.wait(500);

      // Should display normalized as M/D/YYYY (no leading zeros)
      cy.getAgGridCell(testRowIndex, 'statusDate')
        .should('contain.text', '1/15/2025');
    });

    it('should accept M/D/YY format (short year)', () => {
      cy.getAgGridCell(testRowIndex, 'statusDate').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="statusDate"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type('3/5/25')
        .type('{enter}');

      cy.wait(500);

      // Short year 25 should become 2025, displayed as M/D/YYYY
      cy.getAgGridCell(testRowIndex, 'statusDate')
        .should('contain.text', '3/5/2025');
    });

    it('should accept YYYY-MM-DD (ISO format)', () => {
      cy.getAgGridCell(testRowIndex, 'statusDate').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="statusDate"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type('2025-06-20')
        .type('{enter}');

      cy.wait(500);

      // Should display normalized as M/D/YYYY
      cy.getAgGridCell(testRowIndex, 'statusDate')
        .should('contain.text', '6/20/2025');
    });

    it('should accept M.D.YYYY format', () => {
      cy.getAgGridCell(testRowIndex, 'statusDate').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="statusDate"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type('7.4.2025')
        .type('{enter}');

      cy.wait(500);

      // Should display normalized as M/D/YYYY
      cy.getAgGridCell(testRowIndex, 'statusDate')
        .should('contain.text', '7/4/2025');
    });

    it('should normalize date to M/D/YYYY display after saving', () => {
      // Enter with leading zeros
      cy.getAgGridCell(testRowIndex, 'statusDate').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="statusDate"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type('02/03/2025')
        .type('{enter}');

      cy.wait(500);

      // Should strip leading zeros in display
      cy.getAgGridCell(testRowIndex, 'statusDate')
        .should('contain.text', '2/3/2025');
    });

    it('should show alert and revert on invalid date text', () => {
      // Get current cell value before editing
      cy.getAgGridCell(testRowIndex, 'statusDate').invoke('text').then((originalText) => {
        // Set up alert stub
        cy.on('window:alert', cy.stub().as('alertStub'));

        // Enter invalid date
        cy.getAgGridCell(testRowIndex, 'statusDate').click();
        cy.wait(300);

        cy.get(`[row-index="${testRowIndex}"] [col-id="statusDate"]`).first()
          .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
          .clear()
          .type('abc')
          .type('{enter}');

        cy.wait(500);

        // Alert should have been called
        cy.get('@alertStub').should('have.been.calledOnce');

        // Cell should revert to original value
        cy.getAgGridCell(testRowIndex, 'statusDate')
          .invoke('text')
          .should('equal', originalText);
      });
    });

    it('should show alert and revert on invalid date numbers', () => {
      // Get current cell value before editing
      cy.getAgGridCell(testRowIndex, 'statusDate').invoke('text').then((originalText) => {
        // Set up alert stub
        cy.on('window:alert', cy.stub().as('alertStub'));

        // Enter date with invalid month/day
        cy.getAgGridCell(testRowIndex, 'statusDate').click();
        cy.wait(300);

        cy.get(`[row-index="${testRowIndex}"] [col-id="statusDate"]`).first()
          .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
          .clear()
          .type('13/45/2025')
          .type('{enter}');

        cy.wait(500);

        // Alert should have been called
        cy.get('@alertStub').should('have.been.calledOnce');

        // Cell should revert to original value
        cy.getAgGridCell(testRowIndex, 'statusDate')
          .invoke('text')
          .should('equal', originalText);
      });
    });

    it('should save null when clearing date to empty', () => {
      // First set a date so we know it has a value
      cy.getAgGridCell(testRowIndex, 'statusDate').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="statusDate"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type('01/01/2025')
        .type('{enter}');

      cy.wait(500);

      // Verify date is set
      cy.getAgGridCell(testRowIndex, 'statusDate')
        .should('contain.text', '1/1/2025');

      // Now clear the date
      cy.getAgGridCell(testRowIndex, 'statusDate').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="statusDate"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type('{enter}');

      cy.wait(500);

      // Cell text should be empty (or show prompt text if configured)
      cy.getAgGridCell(testRowIndex, 'statusDate')
        .invoke('text')
        .then((text) => {
          // Either completely empty or contains prompt text (not a date)
          expect(text.trim()).to.not.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
        });
    });
  });

  describe('Member Name Editing', () => {
    it('should edit member name', () => {
      const newName = `Test Patient ${Date.now()}`;

      // Click member name cell to enter edit mode
      cy.getAgGridCell(testRowIndex, 'memberName').click();
      cy.wait(300);

      // Clear and type new name
      cy.get(`[row-index="${testRowIndex}"] [col-id="memberName"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type(newName)
        .type('{enter}');

      cy.wait(500);

      // Verify name is displayed
      cy.getAgGridCell(testRowIndex, 'memberName')
        .should('contain.text', newName);
    });

    it('should display updated name immediately after editing', () => {
      const immediateName = `Immediate ${Date.now()}`;

      // Click member name cell
      cy.getAgGridCell(testRowIndex, 'memberName').click();
      cy.wait(300);

      // Type new name and press Tab to commit
      cy.get(`[row-index="${testRowIndex}"] [col-id="memberName"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type(immediateName)
        .type('{tab}');

      cy.wait(300);

      // Name should appear immediately, no page refresh needed
      cy.getAgGridCell(testRowIndex, 'memberName')
        .should('contain.text', immediateName);
    });
  });

  describe('Save Indicator', () => {
    it('should show "Saving..." when edit is committed', () => {
      // Edit a cell to trigger save
      cy.getAgGridCell(testRowIndex, 'notes').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="notes"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type(`Saving test ${Date.now()}`)
        .type('{enter}');

      // "Saving..." should appear in the toolbar
      cy.contains('Saving...').should('be.visible');
    });

    it('should show "Saved" after save completes', () => {
      // Edit a cell to trigger save
      cy.getAgGridCell(testRowIndex, 'notes').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="notes"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type(`Saved test ${Date.now()}`)
        .type('{enter}');

      // Wait for save to complete and show "Saved"
      cy.contains('Saved', { timeout: 5000 }).should('be.visible');
    });

    it('should hide indicator after approximately 2 seconds', () => {
      // Edit a cell to trigger save
      cy.getAgGridCell(testRowIndex, 'notes').click();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="notes"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type(`Disappear test ${Date.now()}`)
        .type('{enter}');

      // Wait for "Saved" to appear
      cy.contains('Saved', { timeout: 5000 }).should('be.visible');

      // After 2 seconds, the indicator should disappear (idle state returns null)
      cy.contains('Saved', { timeout: 5000 }).should('not.exist');
    });
  });
});
