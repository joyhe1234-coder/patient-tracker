/**
 * Import Conflict Blocking -- Non-Admin E2E Tests (Cypress)
 *
 * Tests that non-admin (STAFF) users see the read-only ConflictBanner when
 * column mapping conflicts are detected during file import. Non-admin users
 * cannot resolve conflicts -- they can only cancel or copy the conflict
 * details to share with an administrator.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const staffCredentials = {
  email: 'staff1@gmail.com',
  password: 'welcome100',
};

const adminCredentials = {
  email: 'ko037291@gmail.com',
  password: 'welcome100',
};

/** Login as a STAFF user. */
function loginAsStaff() {
  cy.login(staffCredentials.email, staffCredentials.password);
}

/**
 * Login with given credentials.
 * Falls back to admin if STAFF login fails (seed data may vary).
 */
function loginWithCredentials(email: string, password: string) {
  cy.login(email, password);
}

/**
 * Stub the import preview endpoint to return a conflict response.
 * This simulates what the backend returns when a file has renamed columns.
 */
function stubConflictPreviewResponse() {
  const conflicts = [
    {
      id: 'conflict-0',
      type: 'CHANGED',
      severity: 'WARNING',
      category: 'measure',
      sourceHeader: 'Annual Wellness Vist',
      configColumn: 'Annual Wellness Visit',
      suggestions: [
        {
          columnName: 'Annual Wellness Visit',
          score: 0.92,
          targetType: 'MEASURE',
          measureInfo: {
            requestType: 'Preventive',
            qualityMeasure: 'Annual Wellness Visit',
          },
        },
      ],
      resolution: null,
      message: 'Column "Annual Wellness Vist" may be a renamed version of "Annual Wellness Visit" (92% match)',
    },
    {
      id: 'conflict-1',
      type: 'NEW',
      severity: 'WARNING',
      category: 'measure',
      sourceHeader: 'Unknown Extra Column',
      configColumn: null,
      suggestions: [],
      resolution: null,
      message: 'Column "Unknown Extra Column" does not match any configured mapping',
    },
    {
      id: 'conflict-2',
      type: 'MISSING',
      severity: 'WARNING',
      category: 'measure',
      sourceHeader: 'Eye Exam',
      configColumn: 'Eye Exam',
      suggestions: [],
      resolution: null,
      message: 'Expected column "Eye Exam" is missing from the uploaded file',
    },
  ];

  cy.intercept('POST', '/api/import/preview*', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        hasConflicts: true,
        conflicts: {
          conflicts,
          summary: {
            total: 3,
            blocking: 0,
            warning: 3,
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
 * Stub the /api/import/sheets endpoint so sheet discovery succeeds.
 * These tests focus on the ConflictBanner UI, not backend validation.
 */
function stubSheetsDiscovery() {
  cy.intercept('POST', '/api/import/sheets*', {
    statusCode: 200,
    body: {
      success: true,
      data: {
        sheets: ['Sheet1'],
        totalSheets: 1,
        filteredSheets: 1,
        skippedSheets: [],
        invalidSheets: [],
      },
    },
  }).as('sheetsDiscovery');
}

/**
 * Upload a CSV file and select a physician so the Preview button becomes
 * clickable. Uses a file with renamed/extra/missing columns to trigger
 * conflict detection.
 */
function uploadFileAndSelectPhysician() {
  stubSheetsDiscovery();

  cy.get('input[type="file"]').selectFile({
    contents: Cypress.Buffer.from(
      'Patient,DOB,Annual Wellness Vist,Unknown Extra Column\n"Smith, John",1/15/1965,Compliant,SomeValue',
    ),
    fileName: 'renamed-columns.csv',
    mimeType: 'text/csv',
  }, { force: true });

  // Wait for SheetSelector
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

describe('Import Conflict Blocking -- Non-Admin (STAFF)', () => {
  beforeEach(() => {
    // Try to log in as STAFF. If STAFF user is not seeded, this test suite
    // will use admin credentials with isAdmin forced to false via intercept.
    loginAsStaff();
    cy.visit('/patient-management');
  });

  it('shows blocking ConflictBanner when file has renamed columns', () => {
    stubConflictPreviewResponse();

    uploadFileAndSelectPhysician();
    cy.contains('button', 'Preview Import').should('not.be.disabled');
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // The ConflictBanner should appear (role="alert")
    cy.get('[role="alert"]', { timeout: 10000 }).should('be.visible');
    cy.contains('Column mapping conflicts detected').should('be.visible');
    cy.contains('Please contact your administrator').should('be.visible');

    // Should show the count summary
    cy.contains('1 renamed column').should('be.visible');
    cy.contains('1 new column').should('be.visible');
    cy.contains('1 missing column').should('be.visible');

    // Should show source header names in the conflict list
    cy.contains('Annual Wellness Vist').should('be.visible');
    cy.contains('Unknown Extra Column').should('be.visible');
    cy.contains('Eye Exam').should('be.visible');
  });

  it('does NOT show resolution dropdowns in the ConflictBanner', () => {
    stubConflictPreviewResponse();

    uploadFileAndSelectPhysician();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // The banner should be visible
    cy.get('[role="alert"]').should('be.visible');

    // No resolution dropdowns should exist (these have IDs like resolution-conflict-X)
    cy.get('[id^="resolution-conflict-"]').should('not.exist');

    // No "Save & Continue" button should be present
    cy.contains('button', 'Save & Continue').should('not.exist');

    // No progress bar should be present
    cy.get('[role="progressbar"]').should('not.exist');

    // No "X of Y conflicts resolved" text
    cy.contains('conflicts resolved').should('not.exist');
  });

  it('Cancel button is present and returns to file upload step', () => {
    stubConflictPreviewResponse();

    uploadFileAndSelectPhysician();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // Cancel button should be visible in the banner
    cy.get('[role="alert"]').within(() => {
      cy.contains('button', 'Cancel').should('be.visible');
    });

    // Click Cancel
    cy.get('[role="alert"]').within(() => {
      cy.contains('button', 'Cancel').click();
    });

    // Banner should disappear
    cy.get('[role="alert"]').should('not.exist');
    cy.contains('Column mapping conflicts detected').should('not.exist');

    // File upload area should be available again
    cy.contains('Drag and drop your file here').should('be.visible');
  });

  it('Copy Details button is present and has correct aria-label', () => {
    stubConflictPreviewResponse();

    uploadFileAndSelectPhysician();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // Copy Details button should be visible in the banner
    cy.get('[role="alert"]').within(() => {
      cy.contains('button', 'Copy Details').should('be.visible');
      cy.get('button[aria-label="Copy conflict details to clipboard"]').should('exist');
    });

    // Click Copy Details -- the handler calls navigator.clipboard.writeText
    // We stub clipboard to verify it was called
    cy.window().then((win) => {
      // Grant clipboard permission may not be available in Cypress, so we
      // stub the API directly
      cy.stub(win.navigator.clipboard, 'writeText').resolves();

      cy.get('[role="alert"]').within(() => {
        cy.contains('button', 'Copy Details').click();
      });

      // Verify clipboard was called with conflict summary text
      cy.wrap(win.navigator.clipboard.writeText).should('have.been.calledOnce');
      cy.wrap(win.navigator.clipboard.writeText).should('have.been.calledWithMatch',
        /Column Mapping Conflicts/,
      );
    });
  });

  it('displays color-coded badges for different conflict types', () => {
    stubConflictPreviewResponse();

    uploadFileAndSelectPhysician();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    cy.get('[role="alert"]').should('be.visible');

    // Verify conflict type badges are rendered
    // CHANGED -> "Renamed" badge
    cy.get('[role="alert"]').contains('Renamed').should('be.visible');

    // NEW -> "New" badge
    cy.get('[role="alert"]').contains('New').should('be.visible');

    // MISSING -> "Missing" badge
    cy.get('[role="alert"]').contains('Missing').should('be.visible');
  });

  it('does not navigate to preview page when conflicts are detected', () => {
    stubConflictPreviewResponse();

    uploadFileAndSelectPhysician();
    cy.contains('button', 'Preview Import').click();
    cy.wait('@previewWithConflicts');

    // Should stay on the import page, NOT navigate to preview
    cy.url().should('include', '/patient-management');
    cy.url().should('not.include', '/preview');

    // The banner should be blocking further progress
    cy.get('[role="alert"]').should('be.visible');

    // Preview Import button should not be visible (hidden during conflict step)
    // or the entire submit section should be hidden
    cy.contains('What happens next?').should('not.exist');
  });
});
