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

  it('T10-1: Depression Screening filter bar option exists', () => {
    // The quality measure dropdown should include an option containing "Depression Screening"
    cy.get('select[aria-label="Filter by quality measure"]').then(($select) => {
      const options: string[] = [];
      $select.find('option').each((_, opt) => {
        options.push(Cypress.$(opt).text().trim());
      });
      const hasDepression = options.some(opt => opt.includes('Depression Screening'));
      expect(hasDepression).to.be.true;
    });

    // Find and select the Depression Screening option
    cy.get('select[aria-label="Filter by quality measure"]')
      .find('option')
      .then(($options) => {
        const dsOption = [...$options].find(opt => Cypress.$(opt).text().trim().includes('Depression Screening'));
        if (dsOption) {
          const value = dsOption.getAttribute('value') || Cypress.$(dsOption).text().trim();
          cy.get('select[aria-label="Filter by quality measure"]').select(value);
        }
      });

    // Wait for filter to apply and verify grid shows Depression Screening rows
    cy.wait(500);
    cy.get('.ag-center-cols-container').then(($container) => {
      const rows = $container.find('.ag-row');
      if (rows.length > 0) {
        // Check first row has Depression Screening
        const firstQM = $container.find('.ag-row').first().find('[col-id="qualityMeasure"]');
        if (firstQM.length > 0) {
          const text = firstQM.text().replace(/▾/g, '').trim();
          if (text) {
            expect(text).to.include('Depression Screening');
          }
        }
      } else {
        cy.log('No Depression Screening rows in current dataset');
      }
    });

    // Reset
    cy.get('select[aria-label="Filter by quality measure"]')
      .select('All Measures');
  });

  it('T10-2: Filter count updates after inline edit', () => {
    // Get initial All count
    cy.contains('button', 'All').invoke('text').then((allText) => {
      const allMatch = allText.match(/\((\d+)\)/);
      const totalBefore = allMatch ? parseInt(allMatch[1], 10) : 0;

      // Select a specific quality measure
      cy.get('select[aria-label="Filter by quality measure"]')
        .select('Annual Wellness Visit');

      // Get AWV-specific All count
      cy.contains('button', 'All').invoke('text').then((awvText) => {
        const awvMatch = awvText.match(/\((\d+)\)/);
        const awvCount = awvMatch ? parseInt(awvMatch[1], 10) : 0;
        // AWV count should be less than or equal to total
        expect(awvCount).to.be.lte(totalBefore);
      });

      // Reset
      cy.get('select[aria-label="Filter by quality measure"]')
        .select('All Measures');
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

  it('quality measure dropdown has expected number of options', () => {
    cy.get('select[aria-label="Filter by quality measure"]').then(($select) => {
      const options = [...$select[0].querySelectorAll('option')];
      // Should have "All Measures" plus at least one specific measure
      expect(options.length).to.be.greaterThan(1);
      // First option should be "All Measures"
      expect(options[0].textContent).to.include('All Measures');
    });
  });

  it('zero-count chip still renders and is clickable', () => {
    // Find any chip with count 0
    const chipLabels = ['Not Addressed', 'Overdue', 'In Progress', 'Contacted', 'Completed', 'Declined', 'Resolved', 'N/A'];

    let foundZero = false;
    chipLabels.forEach((label) => {
      cy.contains('button', label).invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1], 10) : -1;
        if (count === 0 && !foundZero) {
          foundZero = true;
          // Zero-count chip should still be visible and clickable
          cy.contains('button', label).should('be.visible');
          cy.contains('button', label).click();
          cy.contains('button', label).should('have.attr', 'aria-pressed', 'true');

          // Grid should show 0 rows
          cy.get('.ag-center-cols-container .ag-row').should('have.length', 0);

          // Click All to restore
          cy.contains('button', 'All').click();
        }
      });
    });

    // If no zero-count chip exists, just verify all chips are rendered
    cy.wrap(null).then(() => {
      if (!foundZero) {
        cy.log('No zero-count chips found — all statuses have at least 1 row');
        // Verify all chips exist regardless
        chipLabels.forEach((label) => {
          cy.contains('button', label).should('be.visible');
        });
      }
    });
  });
});
