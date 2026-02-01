// Import Flow E2E Tests
// Tests the complete import workflow from file upload to execution

describe('Import Flow', () => {
  beforeEach(() => {
    // Visit the import page
    cy.visit('/import');
  });

  describe('Import Page', () => {
    it('displays all three steps', () => {
      cy.contains('Select Healthcare System').should('be.visible');
      cy.contains('Choose Import Mode').should('be.visible');
      cy.contains('Upload File').should('be.visible');
    });

    it('has Hill Healthcare selected by default', () => {
      cy.get('select').should('have.value', 'hill');
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
      // Select Replace All
      cy.contains('label', 'Replace All').click();

      // Upload file
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('Patient,DOB\nJohn Smith,1965-01-15'),
        fileName: 'test.csv',
        mimeType: 'text/csv',
      }, { force: true });

      // Click Preview Import
      cy.contains('button', 'Preview Import').click();

      // Warning modal should appear
      cy.contains('Delete All Existing Data?').should('be.visible');
      cy.contains('This action cannot be undone').should('be.visible');
    });

    it('can cancel Replace All warning', () => {
      cy.contains('label', 'Replace All').click();
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('Patient,DOB\nJohn Smith,1965-01-15'),
        fileName: 'test.csv',
        mimeType: 'text/csv',
      }, { force: true });
      cy.contains('button', 'Preview Import').click();

      // Cancel the warning
      cy.get('.fixed').contains('button', 'Cancel').click();

      // Modal should close
      cy.contains('Delete All Existing Data?').should('not.exist');
    });

    it('shows Preview Import button disabled without file', () => {
      cy.contains('button', 'Preview Import').should('be.disabled');
    });

    it('accepts CSV file upload', () => {
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('Patient,DOB\nJohn Smith,1965-01-15'),
        fileName: 'test.csv',
        mimeType: 'text/csv',
      }, { force: true });

      cy.contains('test.csv').should('be.visible');
      cy.contains('button', 'Preview Import').should('not.be.disabled');
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
        contents: Cypress.Buffer.from('Patient,DOB\nJohn Smith,1965-01-15'),
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

  describe('Import Preview Flow', () => {
    it('navigates to preview page after file upload', () => {
      // Upload a valid test file
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-import.csv', { force: true });

      // Click Preview Import
      cy.contains('button', 'Preview Import').click();

      // Should navigate to preview page (loading state might be too fast to catch)
      cy.url({ timeout: 10000 }).should('include', '/import/preview/');
      cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Import Preview Page', () => {
    beforeEach(() => {
      // Upload a file and navigate to preview
      cy.visit('/import');
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-import.csv', { force: true });
      cy.contains('button', 'Preview Import').click();
      cy.url().should('include', '/import/preview/');
      cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');
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
      // Click on Insert card to filter
      cy.contains('button', 'Insert').click();

      // Should highlight the Insert card (ring-2 is on the button itself)
      cy.contains('button', 'Insert').should('have.class', 'ring-2');

      // Click Total to show all
      cy.contains('button', 'Total').click();
    });

    it('Cancel returns to import page', () => {
      cy.contains('button', 'Cancel').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/import');
    });

    it('Apply Changes button shows record count', () => {
      cy.contains('button', /Apply \d+ Changes/).should('be.visible');
    });
  });

  describe('Import Execution', () => {
    beforeEach(() => {
      // Use Replace mode for clean test
      cy.visit('/import');
      cy.contains('label', 'Replace All').click();
      cy.get('input[type="file"]').selectFile('cypress/fixtures/test-import.csv', { force: true });
      cy.contains('button', 'Preview Import').click();

      // Confirm the Replace All warning
      cy.contains('Delete All Existing Data?').should('be.visible');
      cy.contains('button', 'Yes, Delete All').click();

      cy.url().should('include', '/import/preview/');
      cy.contains('Import Preview', { timeout: 10000 }).should('be.visible');
    });

    it('shows loading state during import', () => {
      cy.contains('button', /Apply \d+ Changes/).click();
      cy.contains('Importing...').should('be.visible');
    });

    it('shows success message after import', () => {
      cy.contains('button', /Apply \d+ Changes/).click();

      // Wait for success screen
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
      cy.url().should('eq', Cypress.config().baseUrl + '/import');
    });

    it('Go to Patient Grid navigates to home', () => {
      cy.contains('button', /Apply \d+ Changes/).click();
      cy.contains('Import Successful', { timeout: 30000 }).should('be.visible');

      cy.contains('Go to Patient Grid').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });
  });

  describe('Error Handling', () => {
    it('shows error for invalid file format', () => {
      cy.visit('/import');

      // Create an invalid CSV (missing required columns - no Patient or DOB)
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('InvalidColumn1,InvalidColumn2\nvalue1,value2'),
        fileName: 'invalid.csv',
        mimeType: 'text/csv',
      }, { force: true });

      cy.contains('button', 'Preview Import').click();

      // Should show error (the error div contains "Error" text, or validation failure message)
      cy.get('.bg-red-50', { timeout: 10000 }).should('be.visible');
    });

    it('shows error for expired preview', () => {
      // Navigate directly to a non-existent preview
      cy.visit('/import/preview/non-existent-preview-id');

      cy.contains('Preview Not Found', { timeout: 10000 }).should('be.visible');
      cy.contains('Start New Import').should('be.visible');
    });

    it('Start New Import from error page works', () => {
      cy.visit('/import/preview/non-existent-preview-id');

      cy.contains('Preview Not Found', { timeout: 10000 }).should('be.visible');
      cy.contains('button', 'Start New Import').click();

      cy.url().should('eq', Cypress.config().baseUrl + '/import');
    });
  });
});
