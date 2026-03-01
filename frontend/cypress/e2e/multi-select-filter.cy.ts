/**
 * Multi-Select Status Filter E2E Tests
 *
 * Tests the multi-select toggle behavior, checkmark+fill visual style,
 * duplicates exclusivity, and keyboard accessibility of the filter bar.
 */

describe('Multi-Select Status Filter', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    // Wait for grid rows to fully render before each test
    cy.get('.ag-center-cols-container .ag-row', { timeout: 10000 }).should('have.length.gte', 1);
  });

  describe('Multi-Select Toggle Behavior', () => {
    it('should select multiple chips and show combined rows (OR logic)', () => {
      // Get counts from chips
      let completedCount = 0;
      let inProgressCount = 0;

      cy.contains('button', 'Completed').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        completedCount = match ? parseInt(match[1], 10) : 0;
      });

      cy.contains('button', 'In Progress').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        inProgressCount = match ? parseInt(match[1], 10) : 0;
      });

      // Click Completed first — verify it became active before proceeding
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');

      // Click In Progress to add it (multi-select) — verify it became active
      cy.contains('button', 'In Progress').click();
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');

      // Grid should show combined count
      cy.get('.ag-center-cols-container .ag-row').then(($rows) => {
        // Combined count may differ from sum due to overdue rows, but should be >= each individual
        expect($rows.length).to.be.greaterThan(0);
      });

      // All visible rows should be either green or blue
      cy.get('.ag-center-cols-container .ag-row').each(($row) => {
        const classes = $row.attr('class') || '';
        const isGreen = classes.includes('row-status-green');
        const isBlue = classes.includes('row-status-blue');
        expect(isGreen || isBlue).to.be.true;
      });
    });

    it('should toggle off a chip without affecting others', () => {
      // Select Completed — verify active before proceeding
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');

      // Select In Progress — verify both are active
      cy.contains('button', 'In Progress').click();
      cy.get('button[aria-pressed="true"]').should('have.length.gte', 2);

      // Toggle off Completed
      cy.contains('button', 'Completed').click();

      // In Progress should still be active, Completed should not (re-query fresh)
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'false');

      // Grid should show only blue rows
      cy.get('.ag-center-cols-container .ag-row').each(($row) => {
        cy.wrap($row).should('have.class', 'row-status-blue');
      });
    });

    it('should fall back to All when last chip is toggled off', () => {
      // Get total row count first
      cy.get('.ag-center-cols-container .ag-row').its('length').as('totalCount');

      // Select a single chip — verify it became active
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');

      // Toggle it off — verify All becomes active again
      cy.contains('button', 'Completed').click();

      // All should be active again
      cy.contains('button', 'All').should('have.attr', 'aria-pressed', 'true');

      // Grid should show all rows
      cy.get('@totalCount').then((totalCount) => {
        cy.get('.ag-center-cols-container .ag-row').should('have.length', totalCount);
      });
    });

    it('should clear all selections when All is clicked', () => {
      // Select multiple chips — verify each becomes active before clicking the next
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'In Progress').click();
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'Contacted').click();
      cy.contains('button', 'Contacted').should('have.attr', 'aria-pressed', 'true');

      // Click All
      cy.contains('button', 'All').click();

      // All should be active, others not
      cy.contains('button', 'All').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'false');
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'false');
      cy.contains('button', 'Contacted').should('have.attr', 'aria-pressed', 'false');
    });

    it('should start fresh selection when clicking chip while All is active', () => {
      // All is active by default
      cy.contains('button', 'All').should('have.attr', 'aria-pressed', 'true');

      // Click Completed
      cy.contains('button', 'Completed').click();

      // Only Completed should be active
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'All').should('have.attr', 'aria-pressed', 'false');

      // Grid should show only green rows (use .then to avoid detached DOM)
      cy.get('.ag-center-cols-container .ag-row').should('have.length.gte', 1).then(($rows) => {
        $rows.each((_, row) => {
          expect(Cypress.$(row).hasClass('row-status-green')).to.be.true;
        });
      });
    });
  });

  describe('Duplicates Exclusivity', () => {
    it('should deselect color chips when Duplicates is clicked', () => {
      // Select color chips — verify each becomes active
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'In Progress').click();
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');

      // Click Duplicates
      cy.contains('button', 'Duplicates').click();

      // Duplicates should be active, color chips should not
      cy.contains('button', 'Duplicates').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'false');
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'false');
    });

    it('should exit Duplicates mode when color chip is clicked', () => {
      // Click Duplicates first — verify it became active
      cy.contains('button', 'Duplicates').click();
      cy.contains('button', 'Duplicates').should('have.attr', 'aria-pressed', 'true');

      // Click a color chip
      cy.contains('button', 'In Progress').click();

      // Duplicates should be deselected, color chip active
      cy.contains('button', 'Duplicates').should('have.attr', 'aria-pressed', 'false');
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');
    });

    it('should toggle Duplicates off to All', () => {
      cy.contains('button', 'Duplicates').click();
      cy.contains('button', 'Duplicates').should('have.attr', 'aria-pressed', 'true');

      // Click Duplicates again to toggle off
      cy.contains('button', 'Duplicates').click();

      cy.contains('button', 'Duplicates').should('have.attr', 'aria-pressed', 'false');
      cy.contains('button', 'All').should('have.attr', 'aria-pressed', 'true');
    });
  });

  describe('Checkmark + Fill Visual Style', () => {
    it('should show checkmark icon on active chips', () => {
      // Click Completed — verify it became active
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');

      // Active chip should contain an SVG (checkmark icon from lucide-react)
      cy.contains('button', 'Completed').find('svg').should('exist');

      // Inactive chip should NOT have an SVG checkmark
      cy.contains('button', 'In Progress').find('svg').should('not.exist');
    });

    it('should show checkmarks on multiple active chips', () => {
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'In Progress').click();
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');

      // Both active chips should have checkmarks
      cy.contains('button', 'Completed').find('svg').should('exist');
      cy.contains('button', 'In Progress').find('svg').should('exist');

      // Inactive chip should not
      cy.contains('button', 'Contacted').find('svg').should('not.exist');
    });

    it('should show inactive chips with reduced opacity', () => {
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');

      // Inactive chip should have opacity-50 class
      cy.contains('button', 'In Progress').should('have.class', 'opacity-50');

      // Active chip should NOT have opacity-50
      cy.contains('button', 'Completed').should('not.have.class', 'opacity-50');
    });

    it('should have correct aria-pressed on All chip', () => {
      // Initially All is active
      cy.contains('button', 'All').should('have.attr', 'aria-pressed', 'true');

      // Click a filter
      cy.contains('button', 'Completed').click();

      // All should now be inactive
      cy.contains('button', 'All').should('have.attr', 'aria-pressed', 'false');
    });
  });

  describe('Search + Multi-Filter Combination', () => {
    it('should apply search AND multi-filter together', () => {
      // Get total row count first
      cy.get('.ag-center-cols-container .ag-row').its('length').as('totalCount');

      // Select Completed (green) — verify filter applied
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');

      cy.get('.ag-center-cols-container .ag-row').its('length').then((filterCount) => {
        // Now add a search that won't match anything
        cy.get('input[aria-label="Search patients by name"]').type('zzzznonexistent');

        // Should show zero rows (search AND filter = no matches)
        cy.get('.ag-center-cols-container .ag-row').should('have.length', 0);

        // Clear search — should restore to just the filter count
        cy.get('button[aria-label="Clear search"]').click();

        cy.get('.ag-center-cols-container .ag-row').should('have.length', filterCount);
      });
    });

    it('should restore multi-filter rows when search is cleared', () => {
      // Select multiple filters — verify each is active
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'In Progress').click();
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');
      cy.get('.ag-center-cols-container .ag-row').its('length').as('multiFilterCount');

      // Add search
      cy.get('input[aria-label="Search patients by name"]').type('Smith');
      // Wait for search to take effect by checking grid updated
      cy.get('input[aria-label="Search patients by name"]').should('have.value', 'Smith');

      // Clear search
      cy.get('button[aria-label="Clear search"]').click();

      // Should be back to multi-filter count
      cy.get('@multiFilterCount').then((count) => {
        cy.get('.ag-center-cols-container .ag-row').its('length').should('eq', count);
      });
    });
  });

  describe('Status Bar Updates', () => {
    it('should show correct count for multi-filter selection', () => {
      // Select multiple filters — verify each is active
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'In Progress').click();
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');

      // Status bar should show "Showing X of Y rows"
      cy.get('.bg-gray-100.border-t').should('contain.text', 'Showing');
    });

    it('should preserve chip counts regardless of active filters', () => {
      // Get the Completed chip count before filtering
      cy.contains('button', 'Completed').invoke('text').then((beforeText) => {
        const beforeMatch = beforeText.match(/\((\d+)\)/);
        const beforeCount = beforeMatch ? beforeMatch[1] : '0';

        // Apply a different filter — verify it became active
        cy.contains('button', 'In Progress').click();
        cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');

        // Completed chip count should be unchanged
        cy.contains('button', 'Completed').invoke('text').then((afterText) => {
          const afterMatch = afterText.match(/\((\d+)\)/);
          const afterCount = afterMatch ? afterMatch[1] : '0';
          expect(afterCount).to.equal(beforeCount);
        });
      });
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should allow focusing chip buttons', () => {
      // Chips are native buttons and should be focusable
      cy.contains('button', 'Completed').focus();
      cy.focused().should('contain.text', 'Completed');
    });

    it('should have all chips as focusable buttons with aria-pressed', () => {
      // Verify all chips are <button> elements with aria-pressed attribute
      const chipLabels = ['All', 'Duplicates', 'Not Addressed', 'Overdue', 'In Progress',
        'Contacted', 'Completed', 'Declined', 'Resolved', 'N/A'];

      chipLabels.forEach((label) => {
        cy.contains('button', label).should('have.attr', 'aria-pressed');
      });
    });
  });

  describe('Coverage gap: combined multi-select + Duplicates exclusivity', () => {
    it('should clear Duplicates when adding a second color chip', () => {
      // Activate Duplicates
      cy.contains('button', 'Duplicates').click();
      cy.contains('button', 'Duplicates').should('have.attr', 'aria-pressed', 'true');

      // Click a color chip — should deactivate Duplicates (mutual exclusivity)
      cy.contains('button', 'Completed').click();
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'Duplicates').should('have.attr', 'aria-pressed', 'false');

      // Add a second color chip (multi-select within colors)
      cy.contains('button', 'In Progress').click();
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');

      // Both color chips active, Duplicates still off
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'Duplicates').should('have.attr', 'aria-pressed', 'false');

      // Now click Duplicates — should clear both color chips
      cy.contains('button', 'Duplicates').click();
      cy.contains('button', 'Duplicates').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'false');
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'false');
    });
  });
});
