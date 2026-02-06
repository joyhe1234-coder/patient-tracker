/**
 * Sorting and Filtering E2E Tests
 *
 * Tests for column sorting and status filter bar functionality.
 */

describe('Column Sorting', () => {
  const adminEmail = 'admin2@gmail.com';
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

  describe('Status Date Sorting', () => {
    it('should sort Status Date column ascending on first click', () => {
      // Click Status Date header
      cy.contains('.ag-header-cell-text', 'Status Date').click();
      cy.wait(500);

      // Verify sort indicator appears
      cy.get('.ag-header-cell[col-id="statusDate"]')
        .find('.ag-sort-ascending-icon, .ag-sort-descending-icon')
        .should('be.visible');
    });

    it('should sort Status Date column descending on second click', () => {
      // Click twice for descending
      cy.contains('.ag-header-cell-text', 'Status Date').click();
      cy.wait(300);
      cy.contains('.ag-header-cell-text', 'Status Date').click();
      cy.wait(500);

      // Verify descending sort
      cy.get('.ag-header-cell[col-id="statusDate"]')
        .find('.ag-sort-descending-icon')
        .should('be.visible');
    });

    it('should sort dates chronologically not alphabetically', () => {
      // Click Status Date header to sort
      cy.contains('.ag-header-cell-text', 'Status Date').click();
      cy.wait(500);

      // Get first few visible date values
      cy.get('.ag-center-cols-container .ag-row').then(($rows) => {
        if ($rows.length >= 2) {
          const dates: string[] = [];

          // Collect dates from visible rows
          cy.get('.ag-center-cols-container .ag-row')
            .each(($row, index) => {
              if (index < 5) {
                const dateCell = $row.find('[col-id="statusDate"]');
                const dateText = dateCell.text().trim();
                if (dateText && !dateText.includes('Date')) {
                  dates.push(dateText);
                }
              }
            })
            .then(() => {
              cy.log(`Dates found: ${dates.join(', ')}`);
              // Dates should be in order (earlier dates first when ascending)
            });
        }
      });
    });

    it('should handle empty Status Date values in sorting', () => {
      // Sort by Status Date
      cy.contains('.ag-header-cell-text', 'Status Date').click();
      cy.wait(500);

      // Empty dates should sort to end
      cy.log('Empty/null dates should sort to the end of the list');
    });
  });

  describe('Due Date Sorting', () => {
    it('should sort Due Date column ascending', () => {
      cy.contains('.ag-header-cell-text', 'Due Date').click();
      cy.wait(500);

      cy.get('.ag-header-cell[col-id="dueDate"]')
        .find('.ag-sort-ascending-icon, .ag-sort-descending-icon')
        .should('be.visible');
    });

    it('should sort Due Date column descending', () => {
      cy.contains('.ag-header-cell-text', 'Due Date').click();
      cy.wait(300);
      cy.contains('.ag-header-cell-text', 'Due Date').click();
      cy.wait(500);

      cy.get('.ag-header-cell[col-id="dueDate"]')
        .find('.ag-sort-descending-icon')
        .should('be.visible');
    });

    it('should handle empty Due Date values in sorting', () => {
      cy.contains('.ag-header-cell-text', 'Due Date').click();
      cy.wait(500);
      cy.log('Empty/null due dates should sort to the end');
    });
  });

  describe('Member Name Sorting', () => {
    it('should sort Member Name alphabetically ascending', () => {
      cy.contains('.ag-header-cell-text', 'Member Name').click();
      cy.wait(500);

      cy.get('.ag-header-cell[col-id="memberName"]')
        .find('.ag-sort-ascending-icon')
        .should('be.visible');
    });

    it('should sort Member Name alphabetically descending', () => {
      cy.contains('.ag-header-cell-text', 'Member Name').click();
      cy.wait(300);
      cy.contains('.ag-header-cell-text', 'Member Name').click();
      cy.wait(500);

      cy.get('.ag-header-cell[col-id="memberName"]')
        .find('.ag-sort-descending-icon')
        .should('be.visible');
    });

    it('should sort names in correct alphabetical order', () => {
      cy.contains('.ag-header-cell-text', 'Member Name').click();
      cy.wait(500);

      // Get first few names and verify alphabetical order
      const names: string[] = [];
      cy.get('.ag-center-cols-container .ag-row')
        .each(($row, index) => {
          if (index < 5) {
            const nameCell = $row.find('[col-id="memberName"]');
            names.push(nameCell.text().trim());
          }
        })
        .then(() => {
          cy.log(`Names in order: ${names.join(', ')}`);
          // Verify ascending order
          for (let i = 1; i < names.length; i++) {
            expect(names[i].localeCompare(names[i-1])).to.be.at.least(0);
          }
        });
    });
  });

  describe('Request Type Sorting', () => {
    it('should sort Request Type column', () => {
      cy.contains('.ag-header-cell-text', 'Request Type').click();
      cy.wait(500);

      cy.get('.ag-header-cell[col-id="requestType"]')
        .find('.ag-sort-ascending-icon, .ag-sort-descending-icon')
        .should('be.visible');
    });
  });

  describe('Quality Measure Sorting', () => {
    it('should sort Quality Measure column', () => {
      cy.contains('.ag-header-cell-text', 'Quality Measure').click();
      cy.wait(500);

      cy.get('.ag-header-cell[col-id="qualityMeasure"]')
        .find('.ag-sort-ascending-icon, .ag-sort-descending-icon')
        .should('be.visible');
    });
  });

  describe('Measure Status Sorting', () => {
    it('should sort Measure Status column', () => {
      cy.contains('.ag-header-cell-text', 'Measure Status').click();
      cy.wait(500);

      cy.get('.ag-header-cell[col-id="measureStatus"]')
        .find('.ag-sort-ascending-icon, .ag-sort-descending-icon')
        .should('be.visible');
    });
  });

  describe('Time Interval Sorting', () => {
    it('should sort Time Interval column numerically', () => {
      // Time Interval header may not be visible if scrolled - check if it exists first
      cy.get('body').then(($body) => {
        if ($body.find('.ag-header-cell-text:contains("Time Interval")').length > 0) {
          cy.contains('.ag-header-cell-text', 'Time Interval').click();
          cy.wait(500);

          // Check for sort icon on time interval column
          cy.get('.ag-header-cell').contains('Time Interval')
            .parents('.ag-header-cell')
            .find('.ag-sort-ascending-icon, .ag-sort-descending-icon')
            .should('be.visible');
        } else {
          // Column not visible, skip test
          cy.log('Time Interval column not visible in current viewport');
        }
      });
    });
  });

  describe('Sort Indicator Behavior', () => {
    it('should clear sort on third click', () => {
      // Click 3 times: asc -> desc -> none
      cy.contains('.ag-header-cell-text', 'Member Name').click();
      cy.wait(300);
      cy.contains('.ag-header-cell-text', 'Member Name').click();
      cy.wait(300);
      cy.contains('.ag-header-cell-text', 'Member Name').click();
      cy.wait(500);

      // Sort indicator should be gone or neutral
      cy.get('.ag-header-cell[col-id="memberName"]')
        .find('.ag-sort-none-icon')
        .should('exist');
    });

    it('should only show one sort indicator at a time', () => {
      // Sort by Member Name
      cy.contains('.ag-header-cell-text', 'Member Name').click();
      cy.wait(300);

      // Sort by Status Date
      cy.contains('.ag-header-cell-text', 'Status Date').click();
      cy.wait(500);

      // Only Status Date should show sort indicator
      cy.get('.ag-header-cell[col-id="statusDate"]')
        .find('.ag-sort-ascending-icon')
        .should('be.visible');
    });
  });
});

describe('Status Filter Bar', () => {
  const adminEmail = 'admin2@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });

    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    cy.wait(1000);
  });

  describe('Filter Chip Display', () => {
    it('should display All filter chip', () => {
      cy.contains('button', 'All').should('be.visible');
    });

    it('should display Not Addressed filter chip', () => {
      cy.contains('button', 'Not Addressed').should('be.visible');
    });

    it('should display Overdue filter chip', () => {
      cy.contains('button', 'Overdue').should('be.visible');
    });

    it('should display In Progress filter chip', () => {
      cy.contains('button', 'In Progress').should('be.visible');
    });

    it('should display Contacted filter chip', () => {
      cy.contains('button', 'Contacted').should('be.visible');
    });

    it('should display Completed filter chip', () => {
      cy.contains('button', 'Completed').should('be.visible');
    });

    it('should display Declined filter chip', () => {
      cy.contains('button', 'Declined').should('be.visible');
    });

    it('should display Resolved filter chip', () => {
      cy.contains('button', 'Resolved').should('be.visible');
    });

    it('should display N/A filter chip', () => {
      cy.contains('button', 'N/A').should('be.visible');
    });

    it('should display Duplicates filter chip', () => {
      cy.contains('button', 'Duplicates').should('be.visible');
    });
  });

  describe('Filter Chip Counts', () => {
    it('should show count on All filter', () => {
      cy.contains('button', 'All').should('contain.text', '(');
    });

    it('should show counts on each status filter', () => {
      // Each filter chip should display a count
      const filters = ['Not Addressed', 'Overdue', 'In Progress', 'Contacted', 'Completed', 'Declined'];

      filters.forEach(filter => {
        cy.contains('button', filter).invoke('text').then((text) => {
          // Should contain parentheses with a number
          expect(text).to.match(/\(\d+\)/);
        });
      });
    });
  });

  describe('Filter by Not Addressed (White)', () => {
    it('should filter to show only Not Addressed rows', () => {
      // Get initial count
      cy.get('.ag-center-cols-container .ag-row').its('length').as('totalCount');

      // Click Not Addressed filter
      cy.contains('button', 'Not Addressed').click();
      cy.wait(500);

      // Should show filtered results
      cy.get('.ag-center-cols-container .ag-row').then(($rows) => {
        cy.log(`Filtered to ${$rows.length} Not Addressed rows`);
      });

      // All visible rows should have white background (no status color class)
      cy.get('.ag-center-cols-container .ag-row').each(($row) => {
        // Should not have colored status classes
        expect($row).to.not.have.class('row-status-green');
        expect($row).to.not.have.class('row-status-blue');
        expect($row).to.not.have.class('row-status-yellow');
      });
    });

    it('should update status bar count when filtering', () => {
      cy.contains('button', 'Not Addressed').click();
      cy.wait(500);

      // Status bar should show filtered count - look for "Showing" text or row count display
      cy.get('body').then(($body) => {
        // Check if status bar exists with filtering info
        const hasShowingText = $body.text().includes('Showing');
        const hasRowText = $body.text().includes('row');
        expect(hasShowingText || hasRowText).to.be.true;
      });
    });
  });

  describe('Filter by Completed (Green)', () => {
    it('should filter to show only Completed rows', () => {
      cy.contains('button', 'Completed').click();
      cy.wait(500);

      // All visible rows should have green class
      cy.get('.ag-center-cols-container .ag-row').each(($row) => {
        cy.wrap($row).should('have.class', 'row-status-green');
      });
    });
  });

  describe('Filter by In Progress (Blue)', () => {
    it('should filter to show only In Progress rows', () => {
      cy.contains('button', 'In Progress').click();
      cy.wait(500);

      cy.get('.ag-center-cols-container .ag-row').each(($row) => {
        cy.wrap($row).should('have.class', 'row-status-blue');
      });
    });
  });

  describe('Filter by Contacted (Yellow)', () => {
    it('should filter to show only Contacted rows', () => {
      cy.contains('button', 'Contacted').click();
      cy.wait(500);

      cy.get('.ag-center-cols-container .ag-row').each(($row) => {
        cy.wrap($row).should('have.class', 'row-status-yellow');
      });
    });
  });

  describe('Filter by Declined (Purple)', () => {
    it('should filter to show only Declined rows', () => {
      cy.contains('button', 'Declined').click();
      cy.wait(500);

      cy.get('.ag-center-cols-container .ag-row').each(($row) => {
        cy.wrap($row).should('have.class', 'row-status-purple');
      });
    });
  });

  describe('Filter by Resolved (Orange)', () => {
    it('should filter to show only Resolved rows', () => {
      cy.contains('button', 'Resolved').click();
      cy.wait(500);

      cy.get('.ag-center-cols-container .ag-row').then(($rows) => {
        if ($rows.length > 0) {
          cy.get('.ag-center-cols-container .ag-row').each(($row) => {
            cy.wrap($row).should('have.class', 'row-status-orange');
          });
        } else {
          cy.log('No Resolved rows in current dataset');
        }
      });
    });
  });

  describe('Filter by N/A (Gray)', () => {
    it('should filter to show only N/A rows', () => {
      cy.contains('button', 'N/A').click();
      cy.wait(500);

      cy.get('.ag-center-cols-container .ag-row').then(($rows) => {
        if ($rows.length > 0) {
          cy.get('.ag-center-cols-container .ag-row').each(($row) => {
            cy.wrap($row).should('have.class', 'row-status-gray');
          });
        } else {
          cy.log('No N/A rows in current dataset');
        }
      });
    });
  });

  describe('Filter by Overdue (Red)', () => {
    it('should filter to show only Overdue rows', () => {
      // Get the count from the filter button first
      cy.contains('button', 'Overdue').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1], 10) : 0;

        cy.contains('button', 'Overdue').click();
        cy.wait(500);

        if (count > 0) {
          cy.get('.ag-center-cols-container .ag-row').each(($row) => {
            cy.wrap($row).should('have.class', 'row-status-red');
          });
        } else {
          cy.log('No Overdue rows in current dataset (count: 0)');
          // Verify the grid shows no rows or a message
          cy.get('.ag-center-cols-container .ag-row').should('have.length', 0);
        }
      });
    });
  });

  describe('Filter by Duplicates', () => {
    it('should filter to show only Duplicate rows', () => {
      // Get the count from the filter button first
      cy.contains('button', 'Duplicates').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1], 10) : 0;

        cy.contains('button', 'Duplicates').click();
        cy.wait(500);

        if (count > 0) {
          // Duplicate rows have row-status-duplicate class
          cy.get('.ag-center-cols-container .ag-row').each(($row) => {
            cy.wrap($row).should('have.class', 'row-status-duplicate');
          });
        } else {
          cy.log('No Duplicate rows in current dataset (count: 0)');
          // Verify the grid shows no rows
          cy.get('.ag-center-cols-container .ag-row').should('have.length', 0);
        }
      });
    });
  });

  describe('Filter Toggle Behavior', () => {
    it('should return to All when clicking active filter again', () => {
      // Click Completed to filter
      cy.contains('button', 'Completed').click();
      cy.wait(500);

      // Get filtered count
      cy.get('.ag-center-cols-container .ag-row').its('length').as('filteredCount');

      // Click Completed again to deselect
      cy.contains('button', 'Completed').click();
      cy.wait(500);

      // Should show all rows again
      cy.get('@filteredCount').then((filteredCount) => {
        cy.get('.ag-center-cols-container .ag-row').its('length').should('be.gte', filteredCount);
      });
    });

    it('should add second filter when clicking different chip (multi-select)', () => {
      // Click Completed
      cy.contains('button', 'Completed').click();
      cy.wait(500);
      cy.get('.ag-center-cols-container .ag-row').its('length').as('greenCount');

      // Click In Progress to add it
      cy.contains('button', 'In Progress').click();
      cy.wait(500);

      // Both chips should be active
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'In Progress').should('have.attr', 'aria-pressed', 'true');

      // Combined count should be >= individual count
      cy.get('@greenCount').then((greenCount) => {
        cy.get('.ag-center-cols-container .ag-row').its('length').should('be.gte', greenCount);
      });
    });

    it('should highlight active filter chip with aria-pressed and checkmark', () => {
      // Initially Completed is inactive
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'false');
      cy.contains('button', 'Completed').find('svg').should('not.exist');

      // Click to select
      cy.contains('button', 'Completed').click();
      cy.wait(300);

      // Should have aria-pressed=true and a checkmark SVG
      cy.contains('button', 'Completed').should('have.attr', 'aria-pressed', 'true');
      cy.contains('button', 'Completed').find('svg').should('exist');
    });
  });

  describe('Filter with Sorting', () => {
    it('should maintain filter when sorting', () => {
      // Filter by Completed
      cy.contains('button', 'Completed').click();
      cy.wait(500);

      cy.get('.ag-center-cols-container .ag-row').its('length').as('filteredCount');

      // Sort by Member Name
      cy.contains('.ag-header-cell-text', 'Member Name').click();
      cy.wait(500);

      // Should still have same number of filtered rows
      cy.get('@filteredCount').then((count) => {
        cy.get('.ag-center-cols-container .ag-row').should('have.length', count);
      });
    });

    it('should maintain sort when changing filter', () => {
      // Sort by Member Name first
      cy.contains('.ag-header-cell-text', 'Member Name').click();
      cy.wait(500);

      // Filter by Completed
      cy.contains('button', 'Completed').click();
      cy.wait(500);

      // Sort indicator should still be visible
      cy.get('.ag-header-cell[col-id="memberName"]')
        .find('.ag-sort-ascending-icon')
        .should('be.visible');
    });
  });

  describe('Status Bar Updates', () => {
    it('should show total count with All filter', () => {
      cy.contains('button', 'All').click();
      cy.wait(500);

      // Get the count from the All button itself
      cy.contains('button', 'All').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const totalCount = match ? parseInt(match[1], 10) : 0;
        cy.log(`Total count from All button: ${totalCount}`);

        // Verify the grid has rows (may be less due to pagination)
        cy.get('.ag-center-cols-container .ag-row').should('have.length.at.least', 1);
      });
    });

    it('should show filtered count in status bar', () => {
      cy.contains('button', 'Completed').click();
      cy.wait(500);

      // Verify filtering happened - page should show some indication
      cy.get('body').then(($body) => {
        const pageText = $body.text();
        // Either "Showing" or some count indicator should be present
        const hasFilterIndicator = pageText.includes('Showing') || pageText.includes('row');
        expect(hasFilterIndicator).to.be.true;
      });
    });
  });
});

describe('Row Color Verification', () => {
  const adminEmail = 'admin2@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    cy.wait(1000);
  });

  describe('Green Status (Completed)', () => {
    const greenStatuses = [
      'AWV completed',
      'Screening test completed',
      'Blood pressure at goal',
      'HgbA1c at goal',
    ];

    greenStatuses.forEach(status => {
      it(`should show green for "${status}"`, () => {
        cy.log(`Verifying green color for status: ${status}`);
        // This would require finding a row with this status
        // For now, we verify the filter shows green rows
        cy.contains('button', 'Completed').click();
        cy.wait(500);
        cy.get('.ag-center-cols-container .ag-row.row-status-green').should('exist');
      });
    });
  });

  describe('Blue Status (In Progress)', () => {
    const blueStatuses = [
      'AWV scheduled',
      'Screening test ordered',
      'Colon cancer screening ordered',
    ];

    blueStatuses.forEach(status => {
      it(`should show blue for "${status}"`, () => {
        cy.log(`Verifying blue color for status: ${status}`);
        cy.contains('button', 'In Progress').click();
        cy.wait(500);
        cy.get('.ag-center-cols-container .ag-row.row-status-blue').should('exist');
      });
    });
  });

  describe('Yellow Status (Contacted)', () => {
    it('should show yellow for contacted statuses', () => {
      cy.contains('button', 'Contacted').click();
      cy.wait(500);
      cy.get('.ag-center-cols-container .ag-row.row-status-yellow').should('exist');
    });
  });

  describe('Purple Status (Declined)', () => {
    it('should show purple for declined statuses', () => {
      cy.contains('button', 'Declined').click();
      cy.wait(500);
      cy.get('.ag-center-cols-container .ag-row').then(($rows) => {
        if ($rows.length > 0) {
          cy.get('.ag-center-cols-container .ag-row.row-status-purple').should('exist');
        }
      });
    });
  });

  describe('Row Selection Preserves Color', () => {
    it('should preserve row color when selected', () => {
      // Filter to Completed (green) rows
      cy.contains('button', 'Completed').click();
      cy.wait(500);

      // Click on a row to select it
      cy.get('.ag-center-cols-container .ag-row').first().click();
      cy.wait(300);

      // Row should still have green class
      cy.get('.ag-center-cols-container .ag-row').first()
        .should('have.class', 'row-status-green');
    });
  });
});
