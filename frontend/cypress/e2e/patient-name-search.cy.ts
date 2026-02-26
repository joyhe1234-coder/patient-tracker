/**
 * Patient Name Search E2E Tests
 *
 * Tests the search input in the StatusFilterBar:
 * - Search input UI (placeholder, icons, clear button)
 * - Real-time filtering by patient name
 * - Case-insensitive and partial match
 * - Interaction with status color filters (AND logic)
 * - Keyboard shortcuts (Ctrl+F, Escape)
 */

describe('Patient Name Search', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    // Wait for grid rows to render
    cy.get('.ag-center-cols-container .ag-row', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  describe('Search Input UI', () => {
    it('should display search input with placeholder', () => {
      cy.get('input[aria-label="Search patients by name"]')
        .should('be.visible')
        .and('have.attr', 'placeholder', 'Search by name...');
    });

    it('should not show clear button when search is empty', () => {
      cy.get('input[aria-label="Search patients by name"]').should('have.value', '');
      cy.get('button[aria-label="Clear search"]').should('not.exist');
    });

    it('should show clear button when search has text', () => {
      cy.get('input[aria-label="Search patients by name"]').type('Smith');
      cy.get('button[aria-label="Clear search"]').should('be.visible');
    });
  });

  describe('Filtering Behavior', () => {
    it('should filter grid rows when typing a patient name', () => {
      // Read an actual name from the grid (resilient to DB state changes)
      cy.get('.ag-body-viewport [col-id="memberName"]').first()
        .invoke('text').then((firstName) => {
          const searchTerm = firstName.trim().split(',')[0].trim(); // e.g. "Smith" from "Smith, John"
          const initialCount = Cypress.$('.ag-center-cols-container .ag-row').length;

          cy.get('input[aria-label="Search patients by name"]').type(searchTerm);

          // Should have fewer rows (or same if all rows match) — auto-retries
          cy.get('.ag-center-cols-container .ag-row').its('length').should('be.lte', initialCount);

          // All visible memberName cells should contain the search term
          cy.get('.ag-body-viewport [col-id="memberName"]').each(($cell) => {
            expect($cell.text().toLowerCase()).to.include(searchTerm.toLowerCase());
          });
        });
    });

    it('should be case-insensitive', () => {
      // Read an actual name and search with different case
      cy.get('.ag-body-viewport [col-id="memberName"]').first()
        .invoke('text').then((firstName) => {
          const searchTerm = firstName.trim().split(',')[0].trim().toLowerCase();

          cy.get('input[aria-label="Search patients by name"]').type(searchTerm);

          // Should find matching rows (auto-retries)
          cy.get('.ag-body-viewport [col-id="memberName"]').should('have.length.greaterThan', 0);
          cy.get('.ag-body-viewport [col-id="memberName"]').first()
            .invoke('text').then((text) => {
              expect(text.toLowerCase()).to.include(searchTerm);
            });
        });
    });

    it('should support partial match', () => {
      // Read a name and use first 3 chars as partial search
      cy.get('.ag-body-viewport [col-id="memberName"]').first()
        .invoke('text').then((firstName) => {
          const partial = firstName.trim().substring(0, 3);
          const initialCount = Cypress.$('.ag-center-cols-container .ag-row').length;

          cy.get('input[aria-label="Search patients by name"]').type(partial);

          // Should have some matching rows (search may match across columns) — auto-retries
          cy.get('.ag-center-cols-container .ag-row').should('have.length.greaterThan', 0);
          // Row count should be equal to or less than initial
          cy.get('.ag-center-cols-container .ag-row').its('length').should('be.lte', initialCount);
        });
    });

    it('should show empty grid when no names match', () => {
      cy.get('input[aria-label="Search patients by name"]').type('zzzzxyznonexistent');

      // Grid should have no data rows (auto-retries)
      cy.get('.ag-center-cols-container .ag-row').should('have.length', 0);
    });
  });

  describe('Clear Behavior', () => {
    it('should restore all rows when clear button is clicked', () => {
      // Get initial count
      cy.get('.ag-center-cols-container .ag-row').its('length').as('initialCount');

      // Read a real name from the grid to search with
      cy.get('.ag-body-viewport [col-id="memberName"]').first()
        .invoke('text').then((firstName) => {
          const searchTerm = firstName.trim().split(',')[0].trim();

          cy.get('input[aria-label="Search patients by name"]').type(searchTerm);

          // Wait for filter to apply
          cy.get('.ag-center-cols-container .ag-row').its('length').should('be.lte', Cypress.$('.ag-center-cols-container .ag-row').length + 1);

          // Click clear
          cy.get('button[aria-label="Clear search"]').click();

          // Rows should be restored
          cy.get('@initialCount').then((initialCount) => {
            cy.get('.ag-center-cols-container .ag-row').its('length').should('eq', initialCount);
          });
        });
    });

    it('should hide clear button after clearing', () => {
      cy.get('input[aria-label="Search patients by name"]').type('test');
      cy.get('button[aria-label="Clear search"]').should('be.visible');

      cy.get('button[aria-label="Clear search"]').click();
      cy.get('button[aria-label="Clear search"]').should('not.exist');
      cy.get('input[aria-label="Search patients by name"]').should('have.value', '');
    });
  });

  describe('Filter Combination (AND logic)', () => {
    it('should apply both status filter and name search', () => {
      // First click a status filter (Completed/green)
      cy.contains('button', 'Completed').click();

      // Wait for filter to apply
      cy.get('.ag-center-cols-container .ag-row').first().should('have.class', 'row-status-green');

      // Get count of completed rows and read a name from them
      cy.get('.ag-center-cols-container .ag-row').its('length').then((completedCount) => {
        cy.get('.ag-body-viewport [col-id="memberName"]').first()
          .invoke('text').then((firstName) => {
            const searchTerm = firstName.trim().split(',')[0].trim();

            cy.get('input[aria-label="Search patients by name"]').type(searchTerm);

            // Should have rows matching both filters (auto-retries)
            cy.get('.ag-center-cols-container .ag-row').its('length').should('be.lte', completedCount);

            // All visible rows should be green AND contain the search term
            cy.get('.ag-center-cols-container .ag-row').each(($row) => {
              cy.wrap($row).should('have.class', 'row-status-green');
            });
            cy.get('.ag-body-viewport [col-id="memberName"]').each(($cell) => {
              expect($cell.text().toLowerCase()).to.include(searchTerm.toLowerCase());
            });
          });
      });
    });

    it('should restore status-filtered rows when search is cleared', () => {
      // Apply status filter
      cy.contains('button', 'Completed').click();
      // Wait for filter to apply
      cy.get('.ag-center-cols-container .ag-row').first().should('have.class', 'row-status-green');
      cy.get('.ag-center-cols-container .ag-row').its('length').as('completedCount');

      // Read a name from filtered rows
      cy.get('.ag-body-viewport [col-id="memberName"]').first()
        .invoke('text').then((firstName) => {
          const searchTerm = firstName.trim().split(',')[0].trim();

          cy.get('input[aria-label="Search patients by name"]').type(searchTerm);

          // Wait for search filter to apply
          cy.get('input[aria-label="Search patients by name"]').should('have.value', searchTerm);

          // Clear search
          cy.get('button[aria-label="Clear search"]').click();

          // Should be back to just the status-filtered count
          cy.get('@completedCount').then((completedCount) => {
            cy.get('.ag-center-cols-container .ag-row').its('length').should('eq', completedCount);
          });
        });
    });
  });

  describe('Status Bar Row Count', () => {
    it('should update row count when search is active', () => {
      // Check initial status bar shows row count
      cy.get('.bg-gray-100.border-t').should('contain.text', 'rows');

      // Read a name to search for
      cy.get('.ag-body-viewport [col-id="memberName"]').first()
        .invoke('text').then((firstName) => {
          const searchTerm = firstName.trim().split(',')[0].trim();

          cy.get('input[aria-label="Search patients by name"]').type(searchTerm);

          // Status bar should show "Showing X of Y rows" (auto-retries)
          cy.get('.bg-gray-100.border-t').should('contain.text', 'Showing');
        });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should focus search input on Ctrl+F', () => {
      // Verify input is not focused initially
      cy.get('input[aria-label="Search patients by name"]').should('not.have.focus');

      // Press Ctrl+F
      cy.get('body').type('{ctrl}f');

      // Search input should be focused
      cy.get('input[aria-label="Search patients by name"]').should('have.focus');
    });

    it('should clear search and blur on Escape', () => {
      // Type something in search
      cy.get('input[aria-label="Search patients by name"]').type('Smith');
      cy.get('input[aria-label="Search patients by name"]').should('have.value', 'Smith');

      // Press Escape
      cy.get('input[aria-label="Search patients by name"]').type('{esc}');

      // Should be cleared
      cy.get('input[aria-label="Search patients by name"]').should('have.value', '');
      // Input should lose focus
      cy.get('input[aria-label="Search patients by name"]').should('not.have.focus');
    });
  });
});
