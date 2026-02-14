/**
 * Insurance Group Filter E2E Tests
 *
 * Tests for the insurance group dropdown filter in the StatusFilterBar.
 * Verifies default selection, option order, filtering behavior, visual indicators,
 * and interaction with other filters.
 */

describe('Insurance Group Filter', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    // Login as admin
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });

    // Wait for grid to load
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    cy.wait(1000);
  });

  describe('Dropdown Rendering', () => {
    it('should render insurance group dropdown with aria-label', () => {
      cy.get('select[aria-label="Filter by insurance group"]').should('exist').and('be.visible');
    });

    it('should default to "Hill" selection', () => {
      cy.get('select[aria-label="Filter by insurance group"]').should('have.value', 'hill');
    });

    it('should show "All" option first', () => {
      cy.get('select[aria-label="Filter by insurance group"] option').first().should('have.value', 'all').and('have.text', 'All');
    });

    it('should show "No Insurance" option last', () => {
      cy.get('select[aria-label="Filter by insurance group"] option').last().should('have.value', 'none').and('have.text', 'No Insurance');
    });

    it('should show system options between All and No Insurance', () => {
      cy.get('select[aria-label="Filter by insurance group"] option').then(($options) => {
        const texts = [...$options].map(o => o.textContent);
        expect(texts[0]).to.equal('All');
        expect(texts[texts.length - 1]).to.equal('No Insurance');
        // At least one system option in between
        expect(texts.length).to.be.greaterThan(2);
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should show active-ring when filter is not "All"', () => {
      // Default is "hill" which is not "all", so ring should be visible
      cy.get('select[aria-label="Filter by insurance group"]')
        .should('have.class', 'ring-2')
        .and('have.class', 'ring-blue-400');
    });

    it('should remove active-ring when "All" is selected', () => {
      cy.get('select[aria-label="Filter by insurance group"]').select('all');
      cy.wait(500);
      cy.get('select[aria-label="Filter by insurance group"]')
        .should('have.class', 'border-gray-300')
        .and('not.have.class', 'ring-blue-400');
    });
  });

  describe('Filtering Behavior', () => {
    it('should show patients when "Hill" is selected (default)', () => {
      // Hill is the default — grid should have rows (all existing patients are Hill)
      cy.get('.ag-center-cols-container .ag-row').should('have.length.greaterThan', 0);
    });

    it('should change data when selecting "All"', () => {
      cy.get('select[aria-label="Filter by insurance group"]').select('all');
      cy.wait(1000);
      // Should still show rows (All includes everything)
      cy.get('.ag-center-cols-container .ag-row').should('have.length.greaterThan', 0);
    });

    it('should filter to zero or more rows when selecting "No Insurance"', () => {
      cy.get('select[aria-label="Filter by insurance group"]').select('none');
      cy.wait(1000);
      // May have 0 rows if all patients are assigned to Hill
      cy.get('.ag-body-viewport').should('exist');
    });
  });

  describe('Filter Persistence and Interaction', () => {
    it('should persist insurance group filter when quality measure changes', () => {
      // Verify insurance group is "hill"
      cy.get('select[aria-label="Filter by insurance group"]').should('have.value', 'hill');

      // Change quality measure filter
      cy.get('select[aria-label="Filter by quality measure"]').then(($select) => {
        const options = [...$select[0].querySelectorAll('option')];
        if (options.length > 1) {
          cy.get('select[aria-label="Filter by quality measure"]').select(options[1].value);
          cy.wait(500);
        }
      });

      // Insurance group should still be "hill"
      cy.get('select[aria-label="Filter by insurance group"]').should('have.value', 'hill');
    });

    it('should combine insurance group filter with quality measure filter', () => {
      // Set insurance group to "Hill"
      cy.get('select[aria-label="Filter by insurance group"]').should('have.value', 'hill');

      // Also set a quality measure filter
      cy.get('select[aria-label="Filter by quality measure"]').then(($select) => {
        const options = [...$select[0].querySelectorAll('option')];
        if (options.length > 1) {
          cy.get('select[aria-label="Filter by quality measure"]').select(options[1].value);
          cy.wait(500);

          // Both filters should be active (both have ring indicators)
          cy.get('select[aria-label="Filter by insurance group"]').should('have.class', 'ring-2');
          cy.get('select[aria-label="Filter by quality measure"]').should('have.class', 'ring-2');
        }
      });
    });
  });
});
