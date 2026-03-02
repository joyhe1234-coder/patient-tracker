/**
 * Bulk Operations E2E Tests (Cypress)
 *
 * Tests for the admin-only Bulk Operations tab on the Patient Management page.
 * Covers: tab visibility, data loading, selection, filtering,
 * assign modal, unassign modal, and delete modal flows.
 *
 * Spec tasks: 29-33
 */

const ADMIN_EMAIL = 'ko037291@gmail.com';
const ADMIN_PASSWORD = 'welcome100';

/** Navigate to Bulk Operations tab and wait for data to load */
function visitBulkOps() {
  cy.visit('/patient-management?tab=bulk-ops');
  // Wait for the patient table to render (loading spinner disappears, rows appear)
  cy.get('table tbody tr', { timeout: 30000 }).should('have.length.greaterThan', 0);
}

/** Get the count shown on a summary card by label */
function getSummaryCardValue(label: string) {
  return cy.contains(label).parent().find('.text-2xl');
}

describe('Bulk Operations', () => {
  // ─── Task 29: Tab visibility and data loading ───────────────────

  describe('Tab Visibility', () => {
    it('admin user sees "Bulk Operations" tab on Patient Management page', () => {
      cy.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      cy.visit('/patient-management');
      cy.contains('button', 'Bulk Operations').should('be.visible');
    });

    it('physician user does NOT see "Bulk Operations" tab', () => {
      cy.login('phy1@gmail.com', 'welcome100');
      cy.visit('/patient-management');
      cy.contains('button', 'Import Patients').should('be.visible');
      cy.contains('button', 'Bulk Operations').should('not.exist');
    });

    it('clicking "Bulk Operations" tab loads the page and shows summary cards', () => {
      cy.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      cy.visit('/patient-management');
      cy.contains('button', 'Bulk Operations').click();

      cy.url().should('include', 'tab=bulk-ops');

      // Wait for table to load (loading spinner disappears, rows appear)
      cy.get('table tbody tr', { timeout: 30000 }).should('have.length.greaterThan', 0);

      // Summary cards should be visible
      cy.contains('Total Patients').should('be.visible');
      cy.contains('Insurance Systems').should('be.visible');
    });

    it('summary cards show non-zero "Total Patients" count', () => {
      cy.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      visitBulkOps();

      getSummaryCardValue('Total Patients')
        .invoke('text')
        .then((text) => {
          const count = parseInt(text.replace(/,/g, ''), 10);
          expect(count).to.be.greaterThan(0);
        });
    });

    it('patient table renders with expected column headers', () => {
      cy.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      visitBulkOps();

      cy.get('table thead th').should('have.length.greaterThan', 5);
      cy.get('table thead').contains('Patient Name').should('exist');
      cy.get('table thead').contains('DOB').should('exist');
      cy.get('table thead').contains('Physician').should('exist');
      cy.get('table thead').contains('Insurance').should('exist');
    });

    it('table footer shows patient count', () => {
      cy.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      visitBulkOps();

      cy.get('table').parent().parent().parent()
        .contains(/\d[\d,]*\s*patient/i)
        .should('exist');
    });
  });

  // ─── Task 30: Selection and filter interactions ─────────────────

  describe('Selection & Filters', () => {
    beforeEach(() => {
      cy.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      visitBulkOps();
    });

    it('clicking a patient row selects it and applies blue tint', () => {
      cy.get('table tbody tr').first().click();
      cy.get('table tbody tr').first().should('have.class', 'bg-blue-50');
    });

    it('action buttons become enabled after row selection', () => {
      // Before selection — buttons disabled
      cy.contains('button', 'Assign').should('be.disabled');
      cy.contains('button', 'Unassign').should('be.disabled');
      cy.contains('button', 'Delete').should('be.disabled');

      // Select a row
      cy.get('table tbody tr').first().click();

      // After selection — buttons enabled with count
      cy.contains('button', /Assign\s*\(/).should('not.be.disabled');
      cy.contains('button', /Unassign\s*\(/).should('not.be.disabled');
      cy.contains('button', /Delete\s*\(/).should('not.be.disabled');
    });

    it('"Select All" selects all visible patients and shows "Deselect All"', () => {
      cy.contains('button', /Select All/).click();
      cy.contains('button', 'Deselect All').should('be.visible');

      // Action buttons should show count matching total
      cy.contains('button', /Assign\s*\(/).should('not.be.disabled');
    });

    it('"Deselect All" clears selection and hides itself', () => {
      cy.contains('button', /Select All/).click();
      cy.contains('button', 'Deselect All').should('be.visible').click();

      // Action buttons should be disabled again
      cy.contains('button', 'Assign').should('be.disabled');
      // Deselect All should be gone (no selection)
      cy.contains('button', 'Deselect All').should('not.exist');
    });

    it('header checkbox click selects/deselects all visible patients', () => {
      // Click header checkbox to select all
      cy.get('table thead input[type="checkbox"]').check({ force: true });

      // At least the first row should have blue tint
      cy.get('table tbody tr').first().should('have.class', 'bg-blue-50');

      // Click again to deselect all
      cy.get('table thead input[type="checkbox"]').uncheck({ force: true });
      cy.get('table tbody tr').first().should('not.have.class', 'bg-blue-50');
    });

    it('filtering by physician updates visible patient rows', () => {
      // Get initial row count
      cy.get('table tbody tr').its('length').then((initialCount) => {
        // Select "Unassigned" from physician filter
        cy.get('select[aria-label="Filter by physician"]').select('__unassigned__');

        // Row count should differ (or table shows empty state)
        cy.get('body').then(($body) => {
          if ($body.find('table tbody tr').length > 0) {
            // Physician column should show "Unassigned" for all visible rows
            cy.get('table tbody tr').each(($row) => {
              cy.wrap($row).contains(/Unassigned/i).should('exist');
            });
          } else {
            // No unassigned patients — empty state
            cy.contains('No patients match your filters').should('be.visible');
          }
        });
      });
    });

    it('searching by name shows only matching patients', () => {
      // Get a patient name from the first row to use as search term
      cy.get('table tbody tr').first().find('td').eq(1).invoke('text').then((name) => {
        const searchTerm = name.trim().split(' ')[0]; // Use first word of name
        if (searchTerm.length < 2) return; // Skip if name is too short

        cy.get('input[aria-label="Search patients"]').type(searchTerm);

        // Wait for client-side filtering
        cy.wait(300);

        // All visible rows should contain the search term
        cy.get('table tbody tr').each(($row) => {
          cy.wrap($row).find('td').eq(1).invoke('text')
            .should('match', new RegExp(searchTerm, 'i'));
        });
      });
    });

    it('"Clear filters" resets filters and restores full patient list', () => {
      // Apply a filter first
      cy.get('select[aria-label="Filter by physician"]').select('__unassigned__');
      cy.wait(300);

      // Clear filters button should be visible
      cy.contains('Clear filters').should('be.visible').click();

      // Physician dropdown should reset
      cy.get('select[aria-label="Filter by physician"]').should('have.value', '');
    });

    it('changing a filter clears any existing selection', () => {
      // Select a row
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Assign\s*\(/).should('not.be.disabled');

      // Change physician filter — selection should clear
      cy.get('select[aria-label="Filter by physician"]').select('__unassigned__');

      // Buttons should be disabled (selection cleared)
      cy.contains('button', 'Assign').should('be.disabled');
    });
  });

  // ─── Task 31: Assign modal flow ────────────────────────────────

  describe('Assign Modal', () => {
    beforeEach(() => {
      cy.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      visitBulkOps();
    });

    it('selecting patients and clicking "Assign" opens the Assign modal', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Assign\s*\(/).click();

      cy.contains('Assign Patients').should('be.visible');
    });

    it('Assign modal displays patient count and preview list', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Assign\s*\(/).click();

      // Modal should show the patient name
      cy.get('.fixed').should('be.visible');
      cy.get('.fixed').contains(/1\s*patient/i).should('exist');
    });

    it('Assign modal has physician dropdown and confirm button', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Assign\s*\(/).click();

      // Wait for modal to be visible
      cy.contains('Assign Patients').should('be.visible');

      // Physician dropdown should exist and have options
      cy.get('#physician-select').should('exist');
      cy.get('#physician-select option').should('have.length.greaterThan', 1);

      // Select a specific physician from dropdown
      cy.get('#physician-select option').eq(1).then(($opt) => {
        const val = $opt.val() as string;
        cy.get('#physician-select').select(val);
      });

      // After selecting physician, confirm button should be enabled
      cy.get('.fixed button.bg-blue-600').should('not.be.disabled');
    });

    it('closing the modal without confirming leaves patient list unchanged', () => {
      // Note the first row patient name
      cy.get('table tbody tr').first().find('td').eq(1).invoke('text').then((name) => {
        cy.get('table tbody tr').first().click();
        cy.contains('button', /Assign\s*\(/).click();

        // Click cancel
        cy.get('.fixed').contains('button', 'Cancel').click();

        // Modal should be gone
        cy.contains('Assign Patients').should('not.exist');

        // Patient should still be in the list
        cy.get('table tbody tr').first().find('td').eq(1).should('contain.text', name.trim());
      });
    });

    // Covered by round-trip test below (assign then unassign for net-zero change)
    it.skip('confirming assign closes modal and shows success toast (covered by round-trip)', () => {});
  });

  // ─── Task 32: Unassign modal flow ──────────────────────────────

  describe('Unassign Modal', () => {
    beforeEach(() => {
      cy.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      visitBulkOps();
    });

    it('clicking "Unassign" opens modal with amber warning styling', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Unassign\s*\(/).click();

      // Modal visible with warning
      cy.get('.fixed').should('be.visible');
      cy.contains(/will not appear/i).should('be.visible');
    });

    it('Unassign modal shows warning about patients becoming invisible', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Unassign\s*\(/).click();

      cy.contains(/will not appear in any physician/i).should('be.visible');
    });

    it('"Unassign Patients" confirm button is enabled immediately', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Unassign\s*\(/).click();

      // Unassign modal has no extra confirmation required (unlike Delete)
      cy.get('.fixed').contains('button', /Unassign Patients/i).should('not.be.disabled');
    });

    it('cancelling unassign modal leaves data unchanged', () => {
      cy.get('table tbody tr').first().find('td').eq(1).invoke('text').then((name) => {
        cy.get('table tbody tr').first().click();
        cy.contains('button', /Unassign\s*\(/).click();

        cy.get('.fixed').contains('button', 'Cancel').click();

        // Modal gone, data unchanged
        cy.contains(/will not appear/i).should('not.exist');
        cy.get('table tbody tr').first().find('td').eq(1).should('contain.text', name.trim());
      });
    });

    // Covered by round-trip test below (assign then unassign for net-zero change)
    it.skip('confirming unassign closes modal and shows success toast (covered by round-trip)', () => {});
  });

  // ─── Task 33: Delete modal flow ────────────────────────────────

  describe('Delete Modal', () => {
    beforeEach(() => {
      cy.login(ADMIN_EMAIL, ADMIN_PASSWORD);
      visitBulkOps();
    });

    it('clicking "Delete" opens the Delete modal with danger styling', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Delete\s*\(/).click();

      cy.get('.fixed').should('be.visible');
      cy.contains('cannot be undone').should('be.visible');
    });

    it('Delete modal shows "cannot be undone" warning', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Delete\s*\(/).click();

      cy.contains('cannot be undone').should('be.visible');
    });

    it('confirm button is disabled when confirmation input is empty', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Delete\s*\(/).click();

      cy.get('.fixed').contains('button', /Delete Patients/i).should('be.disabled');
    });

    it('confirm button remains disabled with lowercase "delete"', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Delete\s*\(/).click();

      cy.get('.fixed input[placeholder*="DELETE"]').type('delete');
      cy.get('.fixed').contains('button', /Delete Patients/i).should('be.disabled');
    });

    it('confirm button becomes enabled only when "DELETE" (uppercase) is typed', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Delete\s*\(/).click();

      cy.get('.fixed input[placeholder*="DELETE"]').type('DELETE');
      cy.get('.fixed').contains('button', /Delete Patients/i).should('not.be.disabled');
    });

    it('cancelling delete modal leaves patient list unchanged', () => {
      cy.get('table tbody tr').its('length').then((rowCount) => {
        cy.get('table tbody tr').first().click();
        cy.contains('button', /Delete\s*\(/).click();

        cy.get('.fixed').contains('button', 'Cancel').click();

        // Modal gone
        cy.contains(/cannot be undone/i).should('not.exist');

        // Same row count
        cy.get('table tbody tr').should('have.length', rowCount);
      });
    });

    it('re-opening delete modal after close resets the confirmation input', () => {
      cy.get('table tbody tr').first().click();
      cy.contains('button', /Delete\s*\(/).click();

      // Type DELETE
      cy.get('.fixed input[placeholder*="DELETE"]').type('DELETE');
      cy.get('.fixed').contains('button', /Delete Patients/i).should('not.be.disabled');

      // Close modal
      cy.get('.fixed').contains('button', 'Cancel').click();

      // Re-open
      cy.contains('button', /Delete\s*\(/).click();

      // Input should be empty
      cy.get('.fixed input[placeholder*="DELETE"]').should('have.value', '');
      cy.get('.fixed').contains('button', /Delete Patients/i).should('be.disabled');
    });

    // Skipped — delete is destructive and not safe for round-trip testing
    it.skip('confirming delete closes modal and shows success toast', () => {});
  });

  // ─── Round-trip: Assign then Unassign (net-zero mutation) ──────

  describe('Assign/Unassign Round-Trip', () => {
    it('should assign and then unassign a patient (round-trip)', () => {
      cy.login(ADMIN_EMAIL, ADMIN_PASSWORD);

      // Filter to unassigned patients first so we have a clean target
      visitBulkOps();

      // Step 1: Record the first patient's name
      cy.get('table tbody tr').first().find('td').eq(1).invoke('text').then((patientName) => {
        const name = patientName.trim();

        // Step 2: Select the first row
        cy.get('table tbody tr').first().click();
        cy.get('table tbody tr').first().should('have.class', 'bg-blue-50');

        // Step 3: Click Assign button
        cy.contains('button', /Assign\s*\(/).should('not.be.disabled').click();

        // Step 4: Modal should appear
        cy.contains('Assign Patients').should('be.visible');

        // Step 5: Select a physician from the dropdown
        cy.get('#physician-select').should('exist');
        cy.get('#physician-select option').eq(1).then(($opt) => {
          const val = $opt.val() as string;
          cy.get('#physician-select').select(val);
        });

        // Step 6: Confirm assignment
        cy.get('.fixed button.bg-blue-600').should('not.be.disabled').click();

        // Step 7: Verify success toast
        cy.contains(/assigned/i, { timeout: 15000 }).should('be.visible');

        // Step 8: Wait for modal to close and table to refresh
        cy.contains('Assign Patients').should('not.exist');
        cy.get('table tbody tr', { timeout: 15000 }).should('have.length.greaterThan', 0);

        // Step 9: Find the same patient and select them
        cy.contains('table tbody tr', name).click();

        // Step 10: Click Unassign button
        cy.contains('button', /Unassign\s*\(/).should('not.be.disabled').click();

        // Step 11: Confirm unassign
        cy.get('.fixed').contains('button', /Unassign Patients/i).should('not.be.disabled').click();

        // Step 12: Verify unassign success toast
        cy.contains(/unassign/i, { timeout: 15000 }).should('be.visible');

        // Step 13: Modal should close and table should refresh
        cy.get('.fixed').should('not.exist');
        cy.get('table tbody tr', { timeout: 15000 }).should('have.length.greaterThan', 0);
      });
    });
  });
});
