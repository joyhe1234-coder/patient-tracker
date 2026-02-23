/**
 * Import Conflict Resolution -- Admin E2E Tests (Cypress)
 *
 * Tests the admin conflict resolution flow when uploading a file with
 * renamed/unknown columns. The ConflictResolutionStep component is shown
 * with per-conflict resolution dropdowns, an aria-live progress region,
 * and a Save & Continue button that is disabled until all conflicts are
 * resolved.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const adminCredentials = {
  email: 'ko037291@gmail.com',
  password: 'welcome100',
};

/** Login as admin. */
function loginAsAdmin() {
  cy.visit('/login');
  cy.get('input[type="email"]').type(adminCredentials.email);
  cy.get('input[type="password"]').type(adminCredentials.password);
  cy.get('button[type="submit"]').click();
  cy.url().should('not.include', '/login', { timeout: 10000 });
}

/**
 * Intercept the import preview endpoint so we can control the conflict
 * response. Returns a stubbed response with `hasConflicts: true`.
 */
function stubConflictPreviewResponse(conflictCount = 2) {
  const conflicts = [];
  for (let i = 0; i < conflictCount; i++) {
    conflicts.push({
      id: `conflict-${i}`,
      type: i === 0 ? 'CHANGED' : 'NEW',
      severity: i === 0 ? 'WARNING' : 'WARNING',
      category: 'measure',
      sourceHeader: i === 0 ? 'Annual Wellness Vist' : 'Brand New Column',
      configColumn: i === 0 ? 'Annual Wellness Visit' : null,
      suggestions: i === 0
        ? [{ columnName: 'Annual Wellness Visit', score: 0.92, targetType: 'MEASURE', measureInfo: { requestType: 'Preventive', qualityMeasure: 'Annual Wellness Visit' } }]
        : [],
      resolution: null,
      message: i === 0
        ? 'Column "Annual Wellness Vist" may be a renamed version of "Annual Wellness Visit" (92% match)'
        : 'Column "Brand New Column" does not match any configured mapping',
    });
  }

  cy.intercept('POST', '/api/import/preview*', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        hasConflicts: true,
        conflicts: {
          conflicts,
          summary: {
            total: conflictCount,
            blocking: 0,
            warning: conflictCount,
            info: 0,
          },
          hasBlockingConflicts: false,
          isWrongFile: false,
        },
      },
    },
  }).as('previewWithConflicts');
}

/**
 * Intercept the conflict resolution endpoint with a success response.
 */
function stubResolveConflictsResponse() {
  cy.intercept('POST', '/api/import/mappings/*/resolve', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        systemId: 'hill',
        systemName: 'Hill Healthcare',
        format: 'wide',
        patientColumns: [],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
        actionMappings: [],
        skipActions: [],
        statusMapping: {},
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: 'Admin User',
      },
    },
  }).as('resolveConflicts');
}

/**
 * Upload a CSV with a renamed column header to trigger conflict detection.
 * Uses inline content to avoid needing a fixture file with specific headers.
 */
function uploadFileWithRenamedColumn() {
  cy.get('input[type="file"]').selectFile({
    contents: Cypress.Buffer.from(
      'Patient,DOB,Annual Wellness Vist,Brand New Column\n"Smith, John",1/15/1965,Compliant,SomeValue',
    ),
    fileName: 'renamed-columns.csv',
    mimeType: 'text/csv',
  }, { force: true });

  // Wait for SheetSelector to appear and select physician
  cy.contains('Select Tab & Physician', { timeout: 10000 }).should('be.visible');
  cy.contains('Assign to Physician', { timeout: 10000 }).should('be.visible');
  cy.get('#physician-selector').then(($el) => {
    if (!$el.val()) {
      cy.get('#physician-selector option').eq(1).then(($opt) => {
        cy.get('#physician-selector').select($opt.val() as string);
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Import Conflict Resolution -- Admin', () => {
  beforeEach(() => {
    loginAsAdmin();
    cy.visit('/patient-management');
  });

  it('renders ConflictResolutionStep with dropdown per conflict when file has renamed columns', () => {
    stubConflictPreviewResponse(2);

    uploadFileWithRenamedColumn();

    // Click Preview Import to trigger the conflict detection
    cy.contains('button', 'Preview Import').should('not.be.disabled');
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // Conflict resolution step should appear
    cy.contains('Column mapping conflicts detected', { timeout: 10000 }).should('be.visible');

    // Each conflict should have a resolution dropdown
    cy.get('[data-testid="conflict-row-conflict-0"]').should('exist');
    cy.get('[data-testid="conflict-row-conflict-1"]').should('exist');

    // Verify dropdowns exist for each conflict
    cy.get('#resolution-conflict-0').should('exist');
    cy.get('#resolution-conflict-1').should('exist');

    // Verify conflict type badges are shown
    cy.contains('Renamed').should('be.visible');
    cy.contains('New').should('be.visible');

    // Verify source header names are displayed
    cy.contains('Annual Wellness Vist').should('be.visible');
    cy.contains('Brand New Column').should('be.visible');
  });

  it('updates resolved count in aria-live region when a resolution is selected', () => {
    stubConflictPreviewResponse(2);

    uploadFileWithRenamedColumn();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // Initially 0 of 2 resolved
    cy.contains('0 of 2 conflicts resolved').should('be.visible');

    // Select a resolution for the first conflict
    cy.get('#resolution-conflict-0').select('ACCEPT_SUGGESTION');

    // Should now show 1 of 2 resolved
    cy.contains('1 of 2 conflicts resolved').should('be.visible');

    // The aria-live region should also contain the updated text
    cy.get('[aria-live="polite"]').should('contain.text', '1 of 2 conflicts resolved');

    // Select a resolution for the second conflict
    cy.get('#resolution-conflict-1').select('IGNORE');

    // Should now show 2 of 2 resolved
    cy.contains('2 of 2 conflicts resolved').should('be.visible');

    // The "All resolved" indicator should appear
    cy.contains('All resolved').should('be.visible');
  });

  it('disables Save & Continue button until all dropdowns have a selection', () => {
    stubConflictPreviewResponse(2);

    uploadFileWithRenamedColumn();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // Save & Continue should be disabled initially
    cy.contains('button', 'Save & Continue').should('be.disabled');

    // Resolve first conflict only
    cy.get('#resolution-conflict-0').select('ACCEPT_SUGGESTION');

    // Still disabled with only 1 of 2 resolved
    cy.contains('button', 'Save & Continue').should('be.disabled');

    // Resolve second conflict
    cy.get('#resolution-conflict-1').select('MAP_TO_MEASURE');

    // Now enabled
    cy.contains('button', 'Save & Continue').should('not.be.disabled');

    // Verify the button can be clicked and submits
    stubResolveConflictsResponse();
    // Also stub the re-submitted preview to return no conflicts
    cy.intercept('POST', '/api/import/preview*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          previewId: 'test-preview-123',
          changes: [],
          summary: { insert: 0, update: 0, skip: 0, delete: 0 },
        },
      },
    }).as('previewAfterResolve');

    cy.contains('button', 'Save & Continue').click();
    cy.wait('@resolveConflicts');
  });

  it('selecting Ignore resolution counts toward resolved total same as mapping resolution', () => {
    stubConflictPreviewResponse(3);

    // Add a third conflict (all NEW type that support IGNORE option)
    cy.intercept('POST', '/api/import/preview*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          hasConflicts: true,
          conflicts: {
            conflicts: [
              {
                id: 'conflict-0',
                type: 'CHANGED',
                severity: 'WARNING',
                category: 'measure',
                sourceHeader: 'Annual Wellness Vist',
                configColumn: 'Annual Wellness Visit',
                suggestions: [{ columnName: 'Annual Wellness Visit', score: 0.92, targetType: 'MEASURE', measureInfo: { requestType: 'Preventive', qualityMeasure: 'Annual Wellness Visit' } }],
                resolution: null,
                message: 'Column may be renamed (92% match)',
              },
              {
                id: 'conflict-1',
                type: 'NEW',
                severity: 'WARNING',
                category: 'measure',
                sourceHeader: 'Unknown Column A',
                configColumn: null,
                suggestions: [],
                resolution: null,
                message: 'Column does not match any configured mapping',
              },
              {
                id: 'conflict-2',
                type: 'NEW',
                severity: 'WARNING',
                category: 'measure',
                sourceHeader: 'Unknown Column B',
                configColumn: null,
                suggestions: [],
                resolution: null,
                message: 'Column does not match any configured mapping',
              },
            ],
            summary: { total: 3, blocking: 0, warning: 3, info: 0 },
            hasBlockingConflicts: false,
            isWrongFile: false,
          },
        },
      },
    }).as('previewWith3Conflicts');

    uploadFileWithRenamedColumn();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWith3Conflicts');

    // 0 of 3 resolved initially
    cy.contains('0 of 3 conflicts resolved').should('be.visible');
    cy.contains('button', 'Save & Continue').should('be.disabled');

    // Use IGNORE for all three -- each should count toward resolved total
    cy.get('#resolution-conflict-0').select('IGNORE');
    cy.contains('1 of 3 conflicts resolved').should('be.visible');

    cy.get('#resolution-conflict-1').select('IGNORE');
    cy.contains('2 of 3 conflicts resolved').should('be.visible');

    cy.get('#resolution-conflict-2').select('IGNORE');
    cy.contains('3 of 3 conflicts resolved').should('be.visible');

    // Save & Continue should now be enabled
    cy.contains('button', 'Save & Continue').should('not.be.disabled');
    cy.contains('All resolved').should('be.visible');
  });

  it('Cancel button returns to file upload step without making API calls', () => {
    stubConflictPreviewResponse(1);

    uploadFileWithRenamedColumn();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // Conflict step is visible
    cy.contains('Column mapping conflicts detected').should('be.visible');

    // Click Cancel
    cy.contains('button', 'Cancel').click();

    // Conflict step should disappear
    cy.contains('Column mapping conflicts detected').should('not.exist');

    // File upload area should be re-enabled (file was cleared)
    cy.contains('Drag and drop your file here').should('be.visible');
  });

  it('shows suggestion score percentage next to fuzzy match suggestions', () => {
    stubConflictPreviewResponse(1);

    uploadFileWithRenamedColumn();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // The first conflict has a suggestion with 92% score
    cy.contains('Annual Wellness Visit').should('be.visible');
    cy.contains('92%').should('be.visible');
    cy.contains('Suggestions:').should('be.visible');
  });

  it('shows color-coded count chips in the summary banner', () => {
    stubConflictPreviewResponse(2);

    uploadFileWithRenamedColumn();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // Should show count chips for the conflict types present
    cy.contains('1 renamed').should('be.visible');
    cy.contains('1 new').should('be.visible');
  });

  it('progress bar updates as conflicts are resolved', () => {
    stubConflictPreviewResponse(2);

    uploadFileWithRenamedColumn();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // Progress bar starts at 0%
    cy.get('[role="progressbar"]')
      .should('have.attr', 'aria-valuenow', '0')
      .and('have.attr', 'aria-valuemax', '2');

    // Resolve first conflict
    cy.get('#resolution-conflict-0').select('ACCEPT_SUGGESTION');

    // Progress bar should update
    cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '1');

    // Resolve second conflict
    cy.get('#resolution-conflict-1').select('IGNORE');

    // Progress bar should show all done
    cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '2');
  });
});
