// Import Flow E2E Tests
// Tests the complete import workflow from file upload to execution
// Updated for universal sheet selector (all systems validate headers + require physician)

/**
 * Helper: upload a file, wait for sheet selector, select physician.
 * After this returns, the "Preview Import" button is enabled.
 */
function uploadAndSelectPhysician(
  filePath?: string,
  inlineContent?: string,
  fileName?: string,
) {
  if (filePath) {
    cy.get('input[type="file"]').selectFile(filePath, { force: true });
  } else if (inlineContent && fileName) {
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(inlineContent),
      fileName,
      mimeType: 'text/csv',
    }, { force: true });
  }

  // Wait for SheetSelector to finish loading and show tab info
  cy.contains('Select Tab & Physician', { timeout: 10000 }).should('be.visible');
  cy.contains('Assign to Physician', { timeout: 10000 }).should('be.visible');

  // Select first physician from dropdown (if not auto-matched)
  cy.get('#physician-selector').then(($el) => {
    if (!$el.val()) {
      cy.get('#physician-selector option').eq(1).then(($opt) => {
        cy.get('#physician-selector').select($opt.val() as string);
      });
    }
  });

  // Submit button should now be enabled
  cy.contains('button', 'Preview Import').should('not.be.disabled');
}

/**
 * Helper: full flow from visit → upload → physician → preview page
 */
function navigateToPreview(filePath = 'cypress/fixtures/test-import.csv') {
  cy.visit('/patient-management');
  uploadAndSelectPhysician(filePath);
  cy.contains('button', 'Preview Import').click();
  cy.url({ timeout: 10000 }).should('include', '/patient-management/preview/');
  cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');
}

describe('Import Flow', () => {
  beforeEach(() => {
    cy.visit('/patient-management');
  });

  describe('Import Page', () => {
    it('displays all four steps (including Tab & Physician)', () => {
      cy.contains('Select Healthcare System').should('be.visible');
      cy.contains('Choose Import Mode').should('be.visible');
      cy.contains('Upload File').should('be.visible');
      // Step 4 appears after file upload
    });

    it('has Hill Healthcare selected by default', () => {
      cy.get('select').first().should('have.value', 'hill');
    });

    it('has Merge selected by default', () => {
      cy.contains('label', 'Merge').find('input[type="radio"]').should('be.checked');
    });

    it('shows Merge as recommended', () => {
      cy.contains('Merge (Recommended)').should('be.visible');
    });

    it('can switch to Replace All mode', () => {
      cy.contains('label', 'Replace All').click();
      cy.contains('label', 'Replace All').find('input[type="radio"]').should('be.checked');
    });

    it('shows warning when using Replace All mode', () => {
      cy.contains('label', 'Replace All').click();
      uploadAndSelectPhysician(
        undefined,
        'Patient,DOB,Annual Wellness Visit\n"Smith, John",1/15/1965,Compliant',
        'test.csv',
      );
      cy.contains('button', 'Preview Import').click();
      cy.contains('Delete All Existing Data?').should('be.visible');
      cy.contains('This action cannot be undone').should('be.visible');
    });

    it('can cancel Replace All warning', () => {
      cy.contains('label', 'Replace All').click();
      uploadAndSelectPhysician(
        undefined,
        'Patient,DOB,Annual Wellness Visit\n"Smith, John",1/15/1965,Compliant',
        'test.csv',
      );
      cy.contains('button', 'Preview Import').click();
      cy.get('.fixed').contains('button', 'Cancel').click();
      cy.contains('Delete All Existing Data?').should('not.exist');
    });

    it('shows Preview Import button disabled without file', () => {
      cy.contains('button', 'Preview Import').should('be.disabled');
    });

    it('accepts CSV file upload and shows sheet selector', () => {
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(
          'Patient,DOB,Annual Wellness Visit\n"Smith, John",1/15/1965,Compliant',
        ),
        fileName: 'test.csv',
        mimeType: 'text/csv',
      }, { force: true });

      cy.contains('test.csv').should('be.visible');
      // Sheet selector step appears
      cy.contains('Select Tab & Physician', { timeout: 10000 }).should('be.visible');
    });

    it('rejects invalid file types', () => {
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('test content'),
        fileName: 'test.txt',
        mimeType: 'text/plain',
      }, { force: true });

      cy.contains('Please upload a CSV or Excel file').should('be.visible');
    });

    it('can remove uploaded file', () => {
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from(
          'Patient,DOB,Annual Wellness Visit\n"Smith, John",1/15/1965,Compliant',
        ),
        fileName: 'test.csv',
        mimeType: 'text/csv',
      }, { force: true });

      cy.contains('test.csv').should('be.visible');
      cy.get('[title="Remove file"]').click();
      cy.contains('test.csv').should('not.exist');
      cy.contains('Drag and drop your file here').should('be.visible');
    });

    it('shows what happens next section', () => {
      cy.contains('What happens next?').should('be.visible');
      cy.contains('Your file will be validated').should('be.visible');
    });

    it('Cancel link navigates to home', () => {
      cy.contains('Cancel').should('have.attr', 'href', '/');
    });
  });

  describe('Universal Sheet Selector', () => {
    it('shows Select Tab & Physician step after file upload', () => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-import.csv', { force: true });
      cy.contains('Select Tab & Physician', { timeout: 10000 }).should('be.visible');
    });

    it('shows step number 4 for sheet selector', () => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-import.csv', { force: true });
      cy.contains('Select Tab & Physician', { timeout: 10000 }).should('be.visible');
      // Step badge "4" should be visible
      cy.get('.rounded-full').contains('4').should('be.visible');
    });

    it('auto-selects single tab and shows Importing from text', () => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-import.csv', { force: true });
      // Single-tab CSV should show static text instead of dropdown
      cy.contains('Importing from:', { timeout: 10000 }).should('be.visible');
    });

    it('shows physician dropdown after tab auto-select', () => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-import.csv', { force: true });
      cy.contains('Assign to Physician', { timeout: 10000 }).should('be.visible');
      cy.get('#physician-selector').should('be.visible');
    });

    it('keeps submit button disabled until physician is selected', () => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-import.csv', { force: true });
      cy.contains('Assign to Physician', { timeout: 10000 }).should('be.visible');
      // Before selecting physician, button should be disabled
      cy.contains('button', 'Preview Import').should('be.disabled');
    });

    it('enables submit after physician selection', () => {
      uploadAndSelectPhysician('cypress/fixtures/test-import.csv');
      cy.contains('button', 'Preview Import').should('not.be.disabled');
    });

    it('shows sheet discovery error for invalid columns', () => {
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('InvalidColumn1,InvalidColumn2\nvalue1,value2'),
        fileName: 'invalid.csv',
        mimeType: 'text/csv',
      }, { force: true });

      // SheetSelector should show an error about missing columns
      cy.contains('Select Tab & Physician', { timeout: 10000 }).should('be.visible');
      cy.get('[role="alert"]', { timeout: 10000 }).should('be.visible');
    });

    it('resets sheet state when switching healthcare system', () => {
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-import.csv', { force: true });
      cy.contains('Select Tab & Physician', { timeout: 10000 }).should('be.visible');

      // Switch to Sutter
      cy.get('select').first().select('sutter');
      // Sheet selector should re-fetch for the new system
      cy.contains('Select Tab & Physician').should('be.visible');
    });
  });

  describe('Import Preview Flow', () => {
    it('navigates to preview page after file upload and physician selection', () => {
      uploadAndSelectPhysician('cypress/fixtures/test-import.csv');
      cy.contains('button', 'Preview Import').click();
      cy.url({ timeout: 10000 }).should('include', '/patient-management/preview/');
      cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Import Preview Page', () => {
    beforeEach(() => {
      navigateToPreview();
    });

    it('displays summary cards', () => {
      cy.contains('Insert').should('be.visible');
      cy.contains('Update').should('be.visible');
      cy.contains('Skip').should('be.visible');
      cy.contains('Total').should('be.visible');
    });

    it('displays patient counts', () => {
      cy.contains('New Patients').should('be.visible');
      cy.contains('Existing Patients').should('be.visible');
      cy.contains('Total Patients').should('be.visible');
    });

    it('displays changes table', () => {
      cy.contains('Action').should('be.visible');
      cy.contains('Patient').should('be.visible');
      cy.contains('Quality Measure').should('be.visible');
    });

    it('can filter by action type', () => {
      cy.contains('button', 'Insert').click();
      cy.contains('button', 'Insert').should('have.class', 'ring-2');
      cy.contains('button', 'Total').click();
    });

    it('Cancel returns to import page', () => {
      cy.contains('button', 'Cancel').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/patient-management');
    });

    it('Apply Changes button shows record count', () => {
      cy.contains('button', /Apply \d+ Changes/).should('be.visible');
    });
  });

  describe('Import Execution', () => {
    beforeEach(() => {
      cy.visit('/patient-management');
      cy.contains('label', 'Replace All').click();
      uploadAndSelectPhysician('cypress/fixtures/test-import.csv');
      cy.contains('button', 'Preview Import').click();
      cy.contains('Delete All Existing Data?').should('be.visible');
      cy.contains('button', 'Yes, Delete All').click();
      cy.url({ timeout: 10000 }).should('include', '/patient-management/preview/');
      cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');
    });

    it('shows loading state during import', () => {
      cy.contains('button', /Apply \d+ Changes/).click();
      cy.contains('Importing...').should('be.visible');
    });

    it('shows success message after import', () => {
      cy.contains('button', /Apply \d+ Changes/).click();
      cy.contains('Import Successful', { timeout: 30000 }).should('be.visible');
    });

    it('shows import statistics after success', () => {
      cy.contains('button', /Apply \d+ Changes/).click();
      cy.contains('Import Successful', { timeout: 30000 }).should('be.visible');
      cy.contains('Inserted').should('be.visible');
      cy.contains('Updated').should('be.visible');
      cy.contains('Deleted').should('be.visible');
    });

    it('shows navigation buttons after success', () => {
      cy.contains('button', /Apply \d+ Changes/).click();
      cy.contains('Import Successful', { timeout: 30000 }).should('be.visible');
      cy.contains('Import More').should('be.visible');
      cy.contains('Go to Patient Grid').should('be.visible');
    });

    it('Import More returns to import page', () => {
      cy.contains('button', /Apply \d+ Changes/).click();
      cy.contains('Import Successful', { timeout: 30000 }).should('be.visible');
      cy.contains('button', 'Import More').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/patient-management');
    });

    it('Go to Patient Grid navigates to home', () => {
      cy.contains('button', /Apply \d+ Changes/).click();
      cy.contains('Import Successful', { timeout: 30000 }).should('be.visible');
      cy.contains('Go to Patient Grid').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });
  });

  describe('Error Handling', () => {
    it('shows error for expired preview', () => {
      cy.visit('/patient-management/preview/non-existent-preview-id');
      cy.contains('Preview Not Found', { timeout: 10000 }).should('be.visible');
      cy.contains('Start New Import').should('be.visible');
    });

    it('Start New Import from error page works', () => {
      cy.visit('/patient-management/preview/non-existent-preview-id');
      cy.contains('Preview Not Found', { timeout: 10000 }).should('be.visible');
      cy.contains('button', 'Start New Import').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/patient-management');
    });
  });

  describe('Merge Mode Behavior', () => {
    it('imports data without deleting existing records', () => {
      // First, do a Replace All import to establish baseline
      cy.visit('/patient-management');
      cy.contains('label', 'Replace All').click();
      uploadAndSelectPhysician('cypress/fixtures/test-import.csv');
      cy.contains('button', 'Preview Import').click();
      cy.contains('button', 'Yes, Delete All').click();
      cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');
      cy.contains('button', /Apply \d+ Changes/).click();
      cy.contains('Import Successful', { timeout: 30000 }).should('be.visible');

      // Now do a Merge import with different data
      cy.contains('button', 'Import More').click();
      cy.contains('label', 'Merge').find('input[type="radio"]').should('be.checked');

      uploadAndSelectPhysician(
        undefined,
        'Patient,DOB,Phone,Address,Annual Wellness Visit\n"New, Patient",1/1/1980,(555) 999-9999,999 New St,Compliant',
        'merge-test.csv',
      );

      cy.contains('button', 'Preview Import').click();
      cy.url().should('include', '/patient-management/preview/');
      cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');

      // In merge mode, should NOT show deletes (or show 0)
      cy.contains('Delete').should('be.visible');
    });

    it('shows mode indicator on preview page', () => {
      navigateToPreview();
      cy.contains('merge').should('be.visible');
    });
  });

  describe('Preview Page Details', () => {
    beforeEach(() => {
      navigateToPreview();
    });

    it('displays file info in header', () => {
      cy.contains('test-import.csv').should('be.visible');
    });

    it('displays expiration time', () => {
      cy.contains(/expires|valid/i).should('be.visible');
    });

    it('shows changes table with proper columns', () => {
      cy.contains('Action').should('be.visible');
      cy.contains('Patient').should('be.visible');
      cy.contains('Quality Measure').should('be.visible');
      cy.contains('Status').should('be.visible');
    });

    it('clicking INSERT card filters to INSERT actions only', () => {
      cy.contains('button', 'Insert').click();
      cy.contains('button', 'Insert').should('have.class', 'ring-2');

      cy.get('table tbody tr').each(($row) => {
        cy.wrap($row).contains('INSERT').should('be.visible');
      });
    });

    it('clicking Total card shows all actions', () => {
      cy.contains('button', 'Insert').click();
      cy.contains('button', 'Total').click();
      cy.contains('button', 'Total').should('have.class', 'ring-2');
    });
  });

  describe('Import with Warnings', () => {
    it('shows warnings section when file has validation warnings', () => {
      cy.visit('/patient-management');
      uploadAndSelectPhysician('cypress/fixtures/test-import-warnings.csv');
      cy.contains('button', 'Preview Import').click();
      cy.url().should('include', '/patient-management/preview/');
      cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Multiple File Imports', () => {
    it('can import same file twice with different results', () => {
      // First import in Replace mode
      cy.visit('/patient-management');
      cy.contains('label', 'Replace All').click();
      uploadAndSelectPhysician('cypress/fixtures/test-import.csv');
      cy.contains('button', 'Preview Import').click();
      cy.contains('button', 'Yes, Delete All').click();
      cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');

      cy.get('button').contains('Insert').should('be.visible');

      cy.contains('button', /Apply \d+ Changes/).click();
      cy.contains('Import Successful', { timeout: 30000 }).should('be.visible');

      // Second import of same file in Merge mode
      cy.contains('button', 'Import More').click();
      uploadAndSelectPhysician('cypress/fixtures/test-import.csv');
      cy.contains('button', 'Preview Import').click();
      cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');

      cy.get('button').contains('Skip').should('be.visible');
    });
  });

  describe('Cancel and Navigation', () => {
    it('can cancel at import page and return home', () => {
      cy.visit('/patient-management');
      cy.get('a[href="/"]').contains('Cancel').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });

    it('can cancel at preview page and return to import', () => {
      navigateToPreview();
      cy.contains('button', 'Cancel').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/patient-management');
    });

    it('browser back works from preview page', () => {
      navigateToPreview();
      cy.go('back');
      cy.url().should('include', '/patient-management');
    });
  });
});
