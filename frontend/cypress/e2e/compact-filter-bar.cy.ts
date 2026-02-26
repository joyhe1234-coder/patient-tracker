/**
 * Compact Filter Bar E2E Tests (Cypress)
 *
 * Tests AG Grid integration with the quality measure dropdown filter,
 * chip count updates, and grid row filtering.
 */

describe('Compact Filter Bar — Grid Integration', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    // Wait for grid rows to render
    cy.get('.ag-center-cols-container .ag-row', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  it('grid shows correct rows when measure is selected', () => {
    // Get initial row count
    cy.get('.ag-center-cols-container .ag-row').its('length').then((initialCount) => {
      // Select a quality measure from the dropdown
      cy.get('select[aria-label="Filter by quality measure"]')
        .select('Annual Wellness Visit');

      // Grid should show only AWV rows (fewer or equal to initial count) — auto-retries
      cy.get('.ag-center-cols-container .ag-row').should('have.length.lte', initialCount);

      // Verify qualityMeasure column shows only the selected measure
      cy.get('.ag-center-cols-container .ag-row').each(($row) => {
        const qualityMeasureCell = $row.find('[col-id="qualityMeasure"]');
        if (qualityMeasureCell.length > 0) {
          const text = qualityMeasureCell.text().trim();
          if (text) {
            expect(text.replace(/▾/g, '').trim()).to.equal('Annual Wellness Visit');
          }
        }
      });

      // Reset to All Measures
      cy.get('select[aria-label="Filter by quality measure"]')
        .select('All Measures');

      // Row count should restore (auto-retries)
      cy.get('.ag-center-cols-container .ag-row').should('have.length', initialCount);
    });
  });

  it('chip counts update when quality measure is selected', () => {
    // Get "All" chip count with All Measures
    cy.contains('button', 'All').invoke('text').then((allText) => {
      const allMatch = allText.match(/\((\d+)\)/);
      const totalCount = allMatch ? parseInt(allMatch[1], 10) : 0;
      expect(totalCount).to.be.greaterThan(0);

      // Select a specific measure
      cy.get('select[aria-label="Filter by quality measure"]')
        .select('Annual Wellness Visit');

      // "All" chip count should decrease (scoped to AWV) — auto-retries
      cy.contains('button', 'All').invoke('text').should('not.equal', allText);
    });
  });

  it('measure dropdown + color chip applies AND filter to grid', () => {
    // Select a measure
    cy.get('select[aria-label="Filter by quality measure"]')
      .select('Annual Wellness Visit');

    // Wait for measure filter to apply
    cy.get('select[aria-label="Filter by quality measure"]').should('have.value', 'Annual Wellness Visit');

    // Get measure-filtered count
    cy.get('.ag-center-cols-container .ag-row').its('length').then((measureCount) => {
      // Click Completed chip (green)
      cy.contains('button', 'Completed').click();

      // Grid should show fewer rows (AND logic: AWV + Completed) — auto-retries
      cy.get('.ag-center-cols-container .ag-row').should('have.length.lte', measureCount);

      // All visible rows should have green status
      cy.get('.ag-center-cols-container .ag-row').each(($row) => {
        const classes = $row.attr('class') || '';
        expect(classes).to.include('row-status-green');
      });

      // Click All to clear color filter
      cy.contains('button', 'All').click();

      // Row count should restore to measure-filtered count (auto-retries)
      cy.get('.ag-center-cols-container .ag-row').should('have.length', measureCount);
    });
  });
});
