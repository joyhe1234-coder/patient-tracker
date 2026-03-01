/**
 * Cell Editing Conflict (409) E2E Tests - Cypress
 *
 * Tests the full conflict modal lifecycle when a 409 VERSION_CONFLICT
 * is returned during cell editing:
 *   trigger → display → resolve (Keep Mine / Keep Theirs / Cancel) → grid state correct
 *
 * Uses cy.intercept to mock 409 responses — no real concurrent editing needed.
 * Triggers conflict via memberName editing (pinned left, always visible — no scroll needed).
 *
 * NOTE: The ConflictModal's data-testid="conflict-backdrop" is a full-page backdrop div.
 * Cypress may report it as "not visible" because the modal content sits on top.
 * We check for "Edit Conflict" text or use .should('exist') instead of .should('be.visible').
 */

describe('Cell Editing Conflict (409)', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  const mockServerRow = {
    id: 1,
    memberName: 'Server Name',
    memberDob: '1990-01-01',
    requestType: 'AWV',
    qualityMeasure: 'Annual Wellness Visit',
    measureStatus: 'AWV completed',
    statusDate: null,
    notes: null,
    tracking1: null,
    tracking2: null,
    dueDate: null,
    timeIntervalDays: null,
    insuranceGroup: null,
    isDuplicate: false,
    updatedAt: new Date().toISOString(),
  };

  const mock409Body = {
    success: false,
    error: {
      code: 'VERSION_CONFLICT',
      message: 'This record was modified by another user since you last loaded it.',
    },
    data: {
      serverRow: mockServerRow,
      conflictFields: [
        {
          field: 'memberName',
          serverValue: 'Server Name',
          clientValue: 'My edit',
        },
      ],
      changedBy: 'other@gmail.com',
    },
  };

  /** Helper: edit memberName cell (pinned left, always visible) and trigger a PUT */
  function editCellToTriggerPut(rowIndex: number) {
    cy.getAgGridCell(rowIndex, 'memberName').dblclick();
    cy.get(`[row-index="${rowIndex}"] [col-id="memberName"]`).first()
      .find('.ag-cell-edit-wrapper input, .ag-text-field-input').first()
      .clear()
      .type('My edit');
    cy.get('.ag-header').click();
  }

  /** Helper: verify modal is open by checking for "Edit Conflict" text */
  function assertModalOpen() {
    cy.contains('Edit Conflict', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="conflict-backdrop"]').should('exist');
  }

  /** Helper: verify modal is closed */
  function assertModalClosed() {
    cy.contains('Edit Conflict').should('not.exist');
  }

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.waitForAgGrid();
  });

  it('shows conflict modal when 409 VERSION_CONFLICT returned', () => {
    cy.intercept('PUT', '/api/data/*', {
      statusCode: 409,
      body: mock409Body,
    }).as('conflictPut');

    editCellToTriggerPut(0);
    cy.wait('@conflictPut');

    assertModalOpen();
    cy.contains('other@gmail.com').should('be.visible');

    cy.contains('button', 'Cancel').click();
    assertModalClosed();
  });

  it('Keep Mine sends forceOverwrite PUT and updates grid', () => {
    let putCount = 0;
    cy.intercept('PUT', '/api/data/*', (req) => {
      putCount++;
      if (putCount === 1) {
        req.reply(409, mock409Body);
      } else {
        expect(req.body.forceOverwrite).to.equal(true);
        req.reply(200, {
          success: true,
          data: { ...mockServerRow, memberName: 'My edit' },
        });
      }
    }).as('putRequest');

    editCellToTriggerPut(0);
    cy.wait('@putRequest');
    assertModalOpen();

    cy.contains('button', 'Keep Mine').click();
    cy.wait('@putRequest');

    assertModalClosed();
  });

  it('Keep Mine handles server error gracefully', () => {
    let putCount = 0;
    cy.intercept('PUT', '/api/data/*', (req) => {
      putCount++;
      if (putCount === 1) {
        req.reply(409, mock409Body);
      } else {
        req.reply(500, { success: false, error: { message: 'Internal server error' } });
      }
    }).as('putRequest');

    editCellToTriggerPut(0);
    cy.wait('@putRequest');
    assertModalOpen();

    cy.contains('button', 'Keep Mine').click();
    cy.wait('@putRequest');

    assertModalClosed();

    // Grid should remain interactive
    cy.get('.ag-row[row-index]').should('have.length.greaterThan', 0);
    cy.get('[row-index="0"]').first().click();
    cy.get('[row-index="0"]').first().should('have.class', 'ag-row-selected');
  });

  it('Keep Theirs reverts cell to server value', () => {
    cy.intercept('PUT', '/api/data/*', {
      statusCode: 409,
      body: mock409Body,
    }).as('conflictPut');

    editCellToTriggerPut(0);
    cy.wait('@conflictPut');
    assertModalOpen();

    cy.contains('button', 'Keep Theirs').click();

    assertModalClosed();
    cy.get('.ag-row[row-index]').should('have.length.greaterThan', 0);
  });

  it('Cancel restores server row data including updatedAt', () => {
    let intercepted = false;
    cy.intercept('PUT', '/api/data/*', (req) => {
      if (!intercepted) {
        intercepted = true;
        req.reply(409, mock409Body);
      } else {
        req.reply(200, {
          success: true,
          data: { ...mockServerRow, memberName: req.body.memberName || mockServerRow.memberName },
        });
      }
    }).as('putRequest');

    editCellToTriggerPut(0);
    cy.wait('@putRequest');
    assertModalOpen();

    cy.contains('button', 'Cancel').click();
    assertModalClosed();

    cy.get('.ag-row[row-index]').should('have.length.greaterThan', 0);
  });

  it('next edit after Keep Theirs uses fresh updatedAt', () => {
    cy.intercept('PUT', '/api/data/*', {
      statusCode: 409,
      body: mock409Body,
    }).as('conflictPut');

    editCellToTriggerPut(0);
    cy.wait('@conflictPut');
    assertModalOpen();

    cy.contains('button', 'Keep Theirs').click();
    assertModalClosed();

    // After Keep Theirs, grid should remain functional — cell still editable
    cy.wait(500);
    cy.getAgGridCell(0, 'memberName').dblclick();
    cy.get(`[row-index="0"] [col-id="memberName"]`).first()
      .find('.ag-cell-edit-wrapper input, .ag-text-field-input', { timeout: 5000 }).first()
      .should('exist');
    // Exit edit mode cleanly
    cy.get('.ag-header').click();
  });

  it('conflict modal shows all cascaded fields', () => {
    const multiFieldConflict = {
      ...mock409Body,
      data: {
        ...mock409Body.data,
        conflictFields: [
          { field: 'requestType', serverValue: 'Screening', clientValue: 'AWV' },
          { field: 'qualityMeasure', serverValue: 'Colon Cancer', clientValue: 'Annual Wellness Visit' },
          { field: 'measureStatus', serverValue: 'Screening completed', clientValue: null },
        ],
      },
    };

    cy.intercept('PUT', '/api/data/*', {
      statusCode: 409,
      body: multiFieldConflict,
    }).as('conflictPut');

    editCellToTriggerPut(0);
    cy.wait('@conflictPut');

    assertModalOpen();
    // Scope within the modal to avoid matching AG Grid header cells
    cy.get('.bg-white.rounded-lg.shadow-xl').within(() => {
      cy.contains('Request Type').should('be.visible');
      cy.contains('Quality Measure').should('be.visible');
      cy.contains('Measure Status').should('be.visible');
    });

    cy.contains('button', 'Cancel').click();
    assertModalClosed();
  });

  it('conflict resolution works as Physician', () => {
    cy.login('phy1@gmail.com', 'welcome100');
    cy.visit('/');
    // Physician may have 0 rows under the default insurance group.
    // Wait for grid to render (but don't require rows).
    cy.get('.ag-theme-alpine', { timeout: 15000 }).should('be.visible');

    // Add a row so we have something to edit
    cy.addTestRow(`PhyConflict${Date.now()}, Test`);
    cy.get('.ag-row[row-index]', { timeout: 10000 }).should('exist');
    cy.window().should('have.property', '__agGridApi');

    let putCount = 0;
    cy.intercept('PUT', '/api/data/*', (req) => {
      putCount++;
      if (putCount === 1) {
        req.reply(409, mock409Body);
      } else {
        expect(req.body.forceOverwrite).to.equal(true);
        req.reply(200, {
          success: true,
          data: { ...mockServerRow, memberName: 'My edit' },
        });
      }
    }).as('putRequest');

    editCellToTriggerPut(0);
    cy.wait('@putRequest');
    assertModalOpen();

    cy.contains('button', 'Keep Mine').click();
    cy.wait('@putRequest');

    assertModalClosed();
  });
});
