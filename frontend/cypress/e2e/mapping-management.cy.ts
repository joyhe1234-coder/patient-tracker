/**
 * Mapping Management Page -- Admin CRUD E2E Tests (Cypress)
 *
 * Tests the /admin/import-mapping page where admins can view, add, edit,
 * and manage column mapping overrides for each import system. Covers
 * system selector, add mapping form, edit mode, and system switching.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const adminCredentials = {
  email: 'ko037291@gmail.com',
  password: 'welcome100',
};

/** Login as admin user. */
function loginAsAdmin() {
  cy.login(adminCredentials.email, adminCredentials.password);
}

/**
 * Stub the import systems list endpoint to return configured systems.
 */
function stubSystemsList() {
  cy.intercept('GET', '/api/import/systems', {
    statusCode: 200,
    body: {
      success: true,
      data: [
        { id: 'hill', name: 'Hill Healthcare', isDefault: true },
        { id: 'sutter', name: 'Sutter Health', isDefault: false },
      ],
    },
  }).as('getSystems');
}

/**
 * Stub the mapping config endpoint for a given system.
 */
function stubMappingConfig(systemId: string) {
  const isLong = systemId === 'sutter';

  const config = {
    systemId,
    systemName: systemId === 'hill' ? 'Hill Healthcare' : 'Sutter Health',
    format: isLong ? 'long' : 'wide',
    patientColumns: [
      {
        sourceColumn: 'Patient',
        targetType: 'PATIENT',
        targetField: 'memberName',
        requestType: null,
        qualityMeasure: null,
        isOverride: false,
        isActive: true,
        overrideId: null,
      },
      {
        sourceColumn: 'DOB',
        targetType: 'PATIENT',
        targetField: 'memberDob',
        requestType: null,
        qualityMeasure: null,
        isOverride: false,
        isActive: true,
        overrideId: null,
      },
    ],
    measureColumns: [
      {
        sourceColumn: 'Annual Wellness Visit',
        targetType: 'MEASURE',
        targetField: null,
        requestType: 'Preventive',
        qualityMeasure: 'Annual Wellness Visit',
        isOverride: false,
        isActive: true,
        overrideId: null,
      },
      {
        sourceColumn: 'Breast Cancer Screening E',
        targetType: 'MEASURE',
        targetField: null,
        requestType: 'Lab',
        qualityMeasure: 'Breast Cancer Screening',
        isOverride: true,
        isActive: true,
        overrideId: 1,
      },
    ],
    dataColumns: [],
    skipColumns: [
      {
        sourceColumn: 'Phone',
        targetType: 'IGNORED',
        targetField: null,
        requestType: null,
        qualityMeasure: null,
        isOverride: false,
        isActive: true,
        overrideId: null,
      },
    ],
    actionMappings: isLong
      ? [
        {
          pattern: 'annual wellness',
          requestType: 'Preventive',
          qualityMeasure: 'Annual Wellness Visit',
          measureStatus: 'Compliant',
          isOverride: false,
          isActive: true,
          overrideId: null,
        },
      ]
      : [],
    skipActions: isLong ? ['Patient refused'] : [],
    statusMapping: {},
    lastModifiedAt: '2026-02-20T10:00:00Z',
    lastModifiedBy: 'Admin User',
  };

  cy.intercept('GET', `/api/import/mappings/${systemId}`, {
    statusCode: 200,
    body: {
      success: true,
      data: config,
    },
  }).as(`getMappings_${systemId}`);
}

/**
 * Stub the columns save endpoint to return an updated config.
 */
function stubSaveColumnMapping(systemId: string) {
  cy.intercept('PUT', `/api/import/mappings/${systemId}/columns`, (req) => {
    // Return a config that includes the newly added mapping
    const newChange = req.body.changes?.[0];
    req.reply({
      statusCode: 200,
      body: {
        success: true,
        data: {
          systemId,
          systemName: systemId === 'hill' ? 'Hill Healthcare' : 'Sutter Health',
          format: systemId === 'sutter' ? 'long' : 'wide',
          patientColumns: [
            {
              sourceColumn: 'Patient',
              targetType: 'PATIENT',
              targetField: 'memberName',
              requestType: null,
              qualityMeasure: null,
              isOverride: false,
              isActive: true,
              overrideId: null,
            },
            {
              sourceColumn: 'DOB',
              targetType: 'PATIENT',
              targetField: 'memberDob',
              requestType: null,
              qualityMeasure: null,
              isOverride: false,
              isActive: true,
              overrideId: null,
            },
          ],
          measureColumns: [
            {
              sourceColumn: 'Annual Wellness Visit',
              targetType: 'MEASURE',
              targetField: null,
              requestType: 'Preventive',
              qualityMeasure: 'Annual Wellness Visit',
              isOverride: false,
              isActive: true,
              overrideId: null,
            },
            {
              sourceColumn: 'Breast Cancer Screening E',
              targetType: 'MEASURE',
              targetField: null,
              requestType: 'Lab',
              qualityMeasure: 'Breast Cancer Screening',
              isOverride: true,
              isActive: true,
              overrideId: 1,
            },
            // Include the new mapping if one was added
            ...(newChange
              ? [{
                sourceColumn: newChange.sourceColumn || 'New Column',
                targetType: newChange.targetType || 'MEASURE',
                targetField: newChange.targetField || null,
                requestType: newChange.requestType || 'Preventive',
                qualityMeasure: newChange.qualityMeasure || 'Annual Wellness Visit',
                isOverride: true,
                isActive: true,
                overrideId: 2,
              }]
              : []),
          ],
          dataColumns: [],
          skipColumns: [],
          actionMappings: [],
          skipActions: [],
          statusMapping: {},
          lastModifiedAt: new Date().toISOString(),
          lastModifiedBy: 'Admin User',
        },
      },
    });
  }).as('saveColumnMapping');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Mapping Management Page -- Admin CRUD', () => {
  beforeEach(() => {
    loginAsAdmin();
  });

  it('system selector shows all configured systems', () => {
    stubSystemsList();
    stubMappingConfig('hill');

    cy.visit('/admin/import-mapping');
    cy.wait('@getSystems');

    // Page title should be visible
    cy.contains('Import Column Mapping', { timeout: 10000 }).should('be.visible');

    // System selector should exist with both options
    cy.get('#system-selector').should('exist');
    cy.get('#system-selector option').should('have.length.at.least', 2);

    // Verify both systems are listed
    cy.get('#system-selector').contains('Hill Healthcare');
    cy.get('#system-selector').contains('Sutter Health');

    // Default system should be pre-selected
    cy.get('#system-selector').should('have.value', 'hill');
  });

  it('Add Mapping button opens inline form with source column input', () => {
    stubSystemsList();
    stubMappingConfig('hill');

    cy.visit('/admin/import-mapping');
    cy.wait('@getSystems');
    cy.wait('@getMappings_hill');

    // Wait for the page to finish loading
    cy.contains('Patient Column Mappings', { timeout: 10000 }).should('be.visible');

    // Click "Add Mapping" button
    cy.contains('button', 'Add Mapping').should('be.visible');
    cy.contains('button', 'Add Mapping').click();

    // Inline form should appear
    cy.contains('Add New Column Mapping').should('be.visible');

    // Source column input should exist
    cy.get('#new-source-column').should('be.visible');
    cy.get('#new-source-column').should('have.attr', 'placeholder');

    // Save and Cancel buttons should be in the form
    cy.contains('button', 'Save Mapping').should('be.visible');
    cy.contains('button', 'Save Mapping').should('be.disabled'); // disabled until source column entered

    // Cancel button should close the form
    cy.get('.border-2.border-blue-200').contains('button', 'Cancel').should('be.visible');
  });

  it('submitting add mapping form saves and updates the table', () => {
    stubSystemsList();
    stubMappingConfig('hill');
    stubSaveColumnMapping('hill');

    cy.visit('/admin/import-mapping');
    cy.wait('@getSystems');
    cy.wait('@getMappings_hill');

    cy.contains('Patient Column Mappings', { timeout: 10000 }).should('be.visible');

    // Open add mapping form
    cy.contains('button', 'Add Mapping').click();
    cy.contains('Add New Column Mapping').should('be.visible');

    // Type source column name
    cy.get('#new-source-column').type('Colonoscopy Screening');

    // Save Mapping button should now be enabled
    cy.contains('button', 'Save Mapping').should('not.be.disabled');

    // Click Save Mapping
    cy.contains('button', 'Save Mapping').click();
    cy.wait('@saveColumnMapping');

    // The add form should close
    cy.contains('Add New Column Mapping').should('not.exist');

    // The new mapping should appear in the table (the stubbed response includes it)
    cy.contains('Colonoscopy Screening').should('be.visible');
  });

  it('Edit Mappings button toggles edit mode for mapping tables', () => {
    stubSystemsList();
    stubMappingConfig('hill');

    cy.visit('/admin/import-mapping');
    cy.wait('@getSystems');
    cy.wait('@getMappings_hill');

    cy.contains('Patient Column Mappings', { timeout: 10000 }).should('be.visible');

    // Should start in view mode -- Edit Mappings button should be visible
    cy.contains('button', 'Edit Mappings').should('be.visible');

    // Click to enter edit mode
    cy.contains('button', 'Edit Mappings').click();

    // Button should now say "Done Editing"
    cy.contains('button', 'Done Editing').should('be.visible');

    // Click again to exit edit mode
    cy.contains('button', 'Done Editing').click();

    // Should return to view mode
    cy.contains('button', 'Edit Mappings').should('be.visible');
  });

  it('switching system in dropdown loads different mapping config', () => {
    stubSystemsList();
    stubMappingConfig('hill');
    stubMappingConfig('sutter');

    cy.visit('/admin/import-mapping');
    cy.wait('@getSystems');
    cy.wait('@getMappings_hill');

    // Hill should be loaded initially
    cy.contains('Patient Column Mappings', { timeout: 10000 }).should('be.visible');
    cy.contains('Annual Wellness Visit').should('be.visible');

    // Action Pattern Configuration should NOT be visible for Hill (wide format)
    cy.contains('Action Pattern Configuration').should('not.exist');

    // Switch to Sutter
    cy.get('#system-selector').select('sutter');
    cy.wait('@getMappings_sutter');

    // Sutter is long format, so Action Pattern Configuration section should appear
    cy.contains('Action Pattern Configuration', { timeout: 10000 }).should('be.visible');

    // Action patterns from Sutter config should be visible
    cy.contains('annual wellness').should('be.visible');

    // Switch back to Hill
    cy.get('#system-selector').select('hill');
    cy.wait('@getMappings_hill');

    // Action Pattern Configuration should disappear again
    cy.contains('Action Pattern Configuration').should('not.exist');
  });

  it('displays last modified metadata from the config', () => {
    stubSystemsList();
    stubMappingConfig('hill');

    cy.visit('/admin/import-mapping');
    cy.wait('@getSystems');
    cy.wait('@getMappings_hill');

    // Last modified info should be displayed
    cy.contains('Last modified:').should('be.visible');
    cy.contains('Admin User').should('be.visible');
  });

  it('shows Patient Column Mappings and Measure Column Mappings sections', () => {
    stubSystemsList();
    stubMappingConfig('hill');

    cy.visit('/admin/import-mapping');
    cy.wait('@getSystems');
    cy.wait('@getMappings_hill');

    // Both section headings should be visible
    cy.contains('Patient Column Mappings', { timeout: 10000 }).should('be.visible');
    cy.contains('Measure Column Mappings').should('be.visible');

    // Patient columns from the config should be listed
    cy.contains('Patient').should('be.visible');
    cy.contains('DOB').should('be.visible');

    // Measure columns from the config should be listed
    cy.contains('Annual Wellness Visit').should('be.visible');
    cy.contains('Breast Cancer Screening').should('be.visible');
  });

  it('shows Ignored Columns section when skip columns exist', () => {
    stubSystemsList();
    stubMappingConfig('hill');

    cy.visit('/admin/import-mapping');
    cy.wait('@getSystems');
    cy.wait('@getMappings_hill');

    // Ignored Columns section should be visible
    cy.contains('Ignored Columns', { timeout: 10000 }).should('be.visible');

    // The skip column "Phone" should be listed
    cy.contains('Phone').should('be.visible');
  });

  it('shows "Using Default Configuration" banner when no overrides exist', () => {
    stubSystemsList();

    // Stub a config with no overrides
    cy.intercept('GET', '/api/import/mappings/hill', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          systemId: 'hill',
          systemName: 'Hill Healthcare',
          format: 'wide',
          patientColumns: [
            {
              sourceColumn: 'Patient',
              targetType: 'PATIENT',
              targetField: 'memberName',
              requestType: null,
              qualityMeasure: null,
              isOverride: false,
              isActive: true,
              overrideId: null,
            },
          ],
          measureColumns: [
            {
              sourceColumn: 'Annual Wellness Visit',
              targetType: 'MEASURE',
              targetField: null,
              requestType: 'Preventive',
              qualityMeasure: 'Annual Wellness Visit',
              isOverride: false,
              isActive: true,
              overrideId: null,
            },
          ],
          dataColumns: [],
          skipColumns: [],
          actionMappings: [],
          skipActions: [],
          statusMapping: {},
          lastModifiedAt: null,
          lastModifiedBy: null,
        },
      },
    }).as('getMappings_hill_noOverrides');

    cy.visit('/admin/import-mapping');
    cy.wait('@getSystems');
    cy.wait('@getMappings_hill_noOverrides');

    // Default configuration banner should be shown
    cy.contains('Using Default Configuration', { timeout: 10000 }).should('be.visible');
    cy.contains('built-in default column mappings').should('be.visible');
  });
});
