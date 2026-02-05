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
  const adminEmail = 'admin2@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    // Login as admin
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });

    // Navigate to main page and wait for grid
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    cy.wait(1000);
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
      // Get initial row count
      cy.get('.ag-center-cols-container .ag-row').its('length').then((initialCount) => {
        // Search for "Smith" - should match "Smith, John" from seed data
        cy.get('input[aria-label="Search patients by name"]').type('Smith');
        cy.wait(300);

        // Should have fewer rows
        cy.get('.ag-center-cols-container .ag-row').its('length').should('be.lessThan', initialCount);

        // All visible memberName cells should contain "Smith"
        cy.get('.ag-center-cols-container [col-id="memberName"]').each(($cell) => {
          expect($cell.text().toLowerCase()).to.include('smith');
        });
      });
    });

    it('should be case-insensitive', () => {
      // Type lowercase
      cy.get('input[aria-label="Search patients by name"]').type('smith');
      cy.wait(300);

      // Should still find "Smith, John"
      cy.get('.ag-center-cols-container [col-id="memberName"]').should('have.length.greaterThan', 0);
      cy.get('.ag-center-cols-container [col-id="memberName"]').first()
        .invoke('text').should('match', /smith/i);
    });

    it('should support partial match', () => {
      // Type just first few characters
      cy.get('input[aria-label="Search patients by name"]').type('Joh');
      cy.wait(300);

      // Should match "Johnson, Mary" and/or "Smith, John"
      cy.get('.ag-center-cols-container [col-id="memberName"]').should('have.length.greaterThan', 0);
      cy.get('.ag-center-cols-container [col-id="memberName"]').each(($cell) => {
        expect($cell.text().toLowerCase()).to.include('joh');
      });
    });

    it('should show empty grid when no names match', () => {
      cy.get('input[aria-label="Search patients by name"]').type('zzzzxyznonexistent');
      cy.wait(300);

      // Grid should have no data rows
      cy.get('.ag-center-cols-container .ag-row').should('have.length', 0);
    });
  });

  describe('Clear Behavior', () => {
    it('should restore all rows when clear button is clicked', () => {
      // Get initial count
      cy.get('.ag-center-cols-container .ag-row').its('length').as('initialCount');

      // Search to filter
      cy.get('input[aria-label="Search patients by name"]').type('Smith');
      cy.wait(300);
      cy.get('.ag-center-cols-container .ag-row').its('length').should('be.lessThan', 10);

      // Click clear
      cy.get('button[aria-label="Clear search"]').click();
      cy.wait(300);

      // Rows should be restored
      cy.get('@initialCount').then((initialCount) => {
        cy.get('.ag-center-cols-container .ag-row').its('length').should('eq', initialCount);
      });
    });

    it('should hide clear button after clearing', () => {
      cy.get('input[aria-label="Search patients by name"]').type('Smith');
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
      cy.wait(500);

      // Get count of completed rows
      cy.get('.ag-center-cols-container .ag-row').its('length').then((completedCount) => {
        // Now also search by name
        cy.get('input[aria-label="Search patients by name"]').type('Smith');
        cy.wait(300);

        // Should have fewer rows than just the status filter alone
        // (unless all completed rows happen to be Smith, which is unlikely)
        cy.get('.ag-center-cols-container .ag-row').its('length').should('be.lte', completedCount);

        // All visible rows should be green AND contain "Smith"
        cy.get('.ag-center-cols-container .ag-row').each(($row) => {
          cy.wrap($row).should('have.class', 'row-status-green');
        });
        cy.get('.ag-center-cols-container [col-id="memberName"]').each(($cell) => {
          expect($cell.text().toLowerCase()).to.include('smith');
        });
      });
    });

    it('should restore status-filtered rows when search is cleared', () => {
      // Apply status filter
      cy.contains('button', 'Completed').click();
      cy.wait(500);
      cy.get('.ag-center-cols-container .ag-row').its('length').as('completedCount');

      // Add search
      cy.get('input[aria-label="Search patients by name"]').type('Smith');
      cy.wait(300);

      // Clear search
      cy.get('button[aria-label="Clear search"]').click();
      cy.wait(300);

      // Should be back to just the status-filtered count
      cy.get('@completedCount').then((completedCount) => {
        cy.get('.ag-center-cols-container .ag-row').its('length').should('eq', completedCount);
      });
    });
  });

  describe('Status Bar Row Count', () => {
    it('should update row count when search is active', () => {
      // Check initial status bar shows row count
      cy.get('.bg-gray-100.border-t').should('contain.text', 'Rows:');

      // Search to filter
      cy.get('input[aria-label="Search patients by name"]').type('Smith');
      cy.wait(300);

      // Status bar should show "Showing X of Y rows"
      cy.get('.bg-gray-100.border-t').should('contain.text', 'Showing');
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
      cy.wait(300);
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
