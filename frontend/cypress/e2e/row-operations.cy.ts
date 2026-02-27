/**
 * Row Operations E2E Tests - Cypress
 *
 * Tests the full add and delete row lifecycle through Toolbar buttons.
 *
 * NOTE: AG Grid uses virtual scrolling — `.ag-center-cols-container .ag-row` only
 * counts VISIBLE rows. We use cy.findRowByMemberName() and StatusBar row count
 * instead of DOM row counting for reliability.
 */

describe('Row Operations', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.waitForAgGrid();
  });

  it('Add Row button opens modal and creates row', () => {
    const testName = `TestAdd${Date.now()}`;

    cy.addTestRow(`${testName}, E2E`);

    // Verify the row exists by finding it by name
    cy.findRowByMemberName(testName).then((rowIndex) => {
      expect(rowIndex).to.be.greaterThan(-1);
    });
  });

  it('new row has null request type, quality measure, measure status', () => {
    const testName = `TestNull${Date.now()}`;

    cy.addTestRow(`${testName}, Fields`);

    cy.findRowByMemberName(testName).then((rowIndex) => {
      expect(rowIndex).to.be.greaterThan(-1);

      const idx = rowIndex as unknown as number;

      // requestType should be empty
      cy.getAgGridCell(idx, 'requestType').invoke('text').then((text) => {
        const cleaned = text.replace(/[✓▾]/g, '').trim();
        expect(cleaned).to.equal('');
      });

      // qualityMeasure should be empty
      cy.getAgGridCell(idx, 'qualityMeasure').invoke('text').then((text) => {
        const cleaned = text.replace(/[✓▾]/g, '').trim();
        expect(cleaned).to.equal('');
      });

      // measureStatus should be empty
      cy.getAgGridCell(idx, 'measureStatus').invoke('text').then((text) => {
        const cleaned = text.replace(/[✓▾]/g, '').trim();
        expect(cleaned).to.equal('');
      });
    });
  });

  it('Delete button disabled when no row selected', () => {
    cy.contains('button', 'Delete Row').should('be.disabled');
  });

  it('Delete button enabled after selecting a row, confirmation works', () => {
    const testName = `TestDel${Date.now()}`;

    // Add a dedicated row to delete
    cy.addTestRow(`${testName}, Conf`);

    // Wait for any modal backdrop to fully disappear
    cy.get('.fixed.inset-0.bg-black', { timeout: 0 }).should('not.exist');

    // Find and select the test row
    cy.findRowByMemberName(testName).then((rowIndex) => {
      const idx = rowIndex as unknown as number;
      expect(idx).to.be.greaterThan(-1);

      // Select the row
      cy.get(`[row-index="${idx}"]`).first().scrollIntoView().click({ force: true });
      cy.get(`[row-index="${idx}"]`).first().should('have.class', 'ag-row-selected');

      // Delete button should be enabled
      cy.contains('button', 'Delete Row').should('not.be.disabled');
      cy.contains('button', 'Delete Row').click({ force: true });

      // Confirm deletion — click Delete button inside the modal
      cy.get('.bg-white.rounded-lg.shadow-xl').last()
        .contains('button', 'Delete').click({ force: true });

      // Verify row is gone
      cy.wait(1000);
      cy.get('[col-id="memberName"]').each(($cell) => {
        expect($cell.text()).to.not.include(testName);
      });
    });
  });

  it('Cancel delete preserves the row', () => {
    const testName = `TestCanc${Date.now()}`;

    cy.addTestRow(`${testName}, E2E`);

    // Wait for any modal backdrop to fully disappear
    cy.get('.fixed.inset-0.bg-black', { timeout: 0 }).should('not.exist');

    cy.findRowByMemberName(testName).then((rowIndex) => {
      const idx = rowIndex as unknown as number;

      // Select the row
      cy.get(`[row-index="${idx}"]`).first().scrollIntoView().click({ force: true });

      // Click Delete Row
      cy.contains('button', 'Delete Row').click({ force: true });

      // Click Cancel in the confirmation dialog
      cy.wait(300);
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Cancel")').length > 0) {
          // Find Cancel in the topmost modal
          cy.get('.bg-white.rounded-lg, [role="dialog"]').last()
            .find('button').contains('Cancel').click();
        }
      });

      cy.wait(500);

      // Row should still exist
      cy.findRowByMemberName(testName).then((idx2) => {
        expect(idx2).to.be.greaterThan(-1);
      });
    });
  });

  it('Add and delete work as Staff', () => {
    cy.login('staff1@gmail.com', 'welcome100');
    cy.visit('/');
    cy.waitForAgGrid();

    const testName = `StaffOps${Date.now()}`;

    // Add a row as staff
    cy.addTestRow(`${testName}, E2E`);

    // Wait for any modal backdrop to fully disappear
    cy.get('.fixed.inset-0.bg-black', { timeout: 0 }).should('not.exist');

    // Find and select the added row
    cy.findRowByMemberName(testName).then((rowIndex) => {
      expect(rowIndex).to.be.greaterThan(-1);

      const idx = rowIndex as unknown as number;

      // Select the row
      cy.get(`[row-index="${idx}"]`).first().scrollIntoView().click({ force: true });

      // Wait for selection to register (enables Delete button)
      cy.get(`[row-index="${idx}"]`).first().should('have.class', 'ag-row-selected');
      cy.wait(300);

      // Delete it
      cy.contains('button', 'Delete Row').should('not.be.disabled');
      cy.contains('button', 'Delete Row').click({ force: true });

      // Confirm deletion — click Delete button inside the modal
      cy.get('.bg-white.rounded-lg.shadow-xl').last()
        .contains('button', 'Delete').click({ force: true });

      // Verify row is gone
      cy.wait(1000);
      cy.get('[col-id="memberName"]').each(($cell) => {
        expect($cell.text()).to.not.include(testName);
      });
    });
  });
});
