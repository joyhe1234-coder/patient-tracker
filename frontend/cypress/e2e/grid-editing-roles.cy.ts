/**
 * Grid Editing Per Role E2E Tests - Cypress
 *
 * Verifies that each role (Admin, Physician, Staff) can edit expected columns.
 * Tests 2 columns per role: one dropdown, one text field.
 *
 * Uses seed accounts:
 *   ko037291@gmail.com — Admin
 *   phy1@gmail.com     — Physician
 *   staff1@gmail.com   — Staff
 *
 * NOTE: Dropdown tests use selectAgGridDropdownAndVerify (with retry) because
 * duplicate detection can trigger 409 and reset the value. Duplicate alerts
 * are suppressed via cy.on('window:alert', stub).
 */

describe('Grid editing as Admin', () => {
  beforeEach(() => {
    cy.login('ko037291@gmail.com', 'welcome100');
    cy.visit('/');
    cy.waitForAgGrid();
    // Suppress duplicate detection alerts that may fire during edits
    cy.on('window:alert', cy.stub());
  });

  it('Admin can edit requestType dropdown', () => {
    const testName = `AdminDrop${Date.now()}`;

    // Add a fresh row to avoid duplicate detection collisions with existing data
    cy.addTestRow(`${testName}, Test`);

    cy.findRowByMemberName(testName).then((rowIndex) => {
      const idx = rowIndex as unknown as number;

      // Edit the new row's requestType (starts blank, no duplicate risk)
      cy.selectAgGridDropdownAndVerify(idx, 'requestType', 'AWV');

      cy.getAgGridCell(idx, 'requestType').invoke('text').then((text) => {
        const cleaned = text.replace(/[✓▾]/g, '').trim();
        expect(cleaned).to.include('AWV');
      });
    });
  });

  it('Admin can edit notes text field', () => {
    const testNote = `Admin note ${Date.now()}`;
    const testName = `AdminNote${Date.now()}`;

    // Add a fresh row to avoid stale-version conflicts from previous test's edits
    cy.addTestRow(`${testName}, Test`);

    cy.findRowByMemberName(testName).then((rowIndex) => {
      const idx = rowIndex as unknown as number;
      expect(idx).to.be.greaterThan(-1);

      cy.getAgGridCellWithScroll(idx, 'notes').dblclick();

      cy.get(`[row-index="${idx}"] [col-id="notes"]`).first()
        .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
        .clear()
        .type(testNote);

      // Commit by clicking header
      cy.get('.ag-header').click();
      cy.wait(500);

      cy.getAgGridCellWithScroll(idx, 'notes')
        .should('contain.text', testNote);
    });
  });
});

describe('Grid editing as Physician', () => {
  beforeEach(() => {
    cy.login('phy1@gmail.com', 'welcome100');
    cy.visit('/');
    // Physician may have 0 rows under default insurance group
    cy.get('.ag-theme-alpine', { timeout: 15000 }).should('be.visible');
    // Add a test row so there's always something to edit
    cy.addTestRow(`PhyRole${Date.now()}, Test`);
    cy.get('.ag-row[row-index]', { timeout: 10000 }).should('exist');
    cy.window().should('have.property', '__agGridApi');
    cy.on('window:alert', cy.stub());
  });

  it('Physician can edit measureStatus dropdown', () => {
    // First ensure row 0 has a requestType so measureStatus options are available
    // Set requestType first, then select a valid measureStatus for that requestType
    cy.selectAgGridDropdownAndVerify(0, 'requestType', 'AWV');
    cy.wait(500);

    // Now measureStatus dropdown should have AWV-specific options
    cy.selectAgGridDropdownAndVerify(0, 'measureStatus', 'AWV completed');

    cy.getAgGridCell(0, 'measureStatus').invoke('text').then((text) => {
      const cleaned = text.replace(/[✓▾]/g, '').trim();
      expect(cleaned).to.include('AWV completed');
    });
  });

  it('Physician can edit member name', () => {
    const newName = `PhyEdit ${Date.now()}`;

    cy.getAgGridCell(0, 'memberName').dblclick();

    cy.get(`[row-index="0"] [col-id="memberName"]`).first()
      .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
      .clear()
      .type(newName)
      .type('{enter}');

    cy.wait(500);
    cy.getAgGridCell(0, 'memberName').should('contain.text', newName);
  });
});

describe('Grid editing as Staff', () => {
  beforeEach(() => {
    cy.login('staff1@gmail.com', 'welcome100');
    cy.visit('/');
    // Staff may have 0 rows under default insurance group
    cy.get('.ag-theme-alpine', { timeout: 15000 }).should('be.visible');
    cy.on('window:alert', cy.stub());
  });

  it('Staff can edit requestType dropdown', () => {
    const testName = `StaffDrop${Date.now()}`;

    // Add a fresh row to avoid duplicate detection collisions
    cy.addTestRow(`${testName}, Test`);

    cy.findRowByMemberName(testName).then((rowIndex) => {
      const idx = rowIndex as unknown as number;

      cy.selectAgGridDropdownAndVerify(idx, 'requestType', 'AWV');

      cy.getAgGridCell(idx, 'requestType').invoke('text').then((text) => {
        const cleaned = text.replace(/[✓▾]/g, '').trim();
        expect(cleaned).to.include('AWV');
      });
    });
  });

  it('Staff can edit notes text field', () => {
    const testNote = `Staff note ${Date.now()}`;
    const testName = `StaffNote${Date.now()}`;

    // Add a row so we have something to edit
    cy.addTestRow(`${testName}, Test`);
    cy.get('.ag-row[row-index]', { timeout: 10000 }).should('exist');
    cy.window().should('have.property', '__agGridApi');

    cy.getAgGridCellWithScroll(0, 'notes').dblclick();

    cy.get(`[row-index="0"] [col-id="notes"]`).first()
      .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
      .clear()
      .type(testNote);

    cy.get('.ag-header').click();
    cy.wait(500);

    cy.getAgGridCellWithScroll(0, 'notes')
      .should('contain.text', testNote);
  });
});
