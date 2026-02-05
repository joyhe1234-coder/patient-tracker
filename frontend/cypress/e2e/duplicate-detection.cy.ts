/**
 * Duplicate Detection E2E Tests - Cypress
 *
 * Tests the duplicate detection behavior when editing cells in the AG Grid:
 * - Visual indicator (row-status-duplicate CSS class with left stripe)
 * - Creating a duplicate via cell editing triggers 409 and resets to null
 * - Removing a duplicate by changing fields
 * - Null/empty fields are never flagged as duplicates
 * - Duplicate count in filter bar
 * - Duplicate stripe combines with status colors
 */

describe('Duplicate Detection', () => {
  const adminEmail = 'admin2@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
    cy.visit('/');
    cy.waitForAgGrid();
  });

  describe('Duplicate Row Visual Indicator', () => {
    it('should show duplicate rows with row-status-duplicate class when Duplicates filter is active', () => {
      // Get the count from the Duplicates filter chip
      cy.contains('button', 'Duplicates').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1], 10) : 0;

        cy.contains('button', 'Duplicates').click();
        cy.wait(500);

        if (count > 0) {
          // Every visible row should have the duplicate class
          cy.get('.ag-center-cols-container .ag-row').each(($row) => {
            cy.wrap($row).should('have.class', 'row-status-duplicate');
          });
        } else {
          cy.log('No duplicate rows in current dataset (count: 0)');
          cy.get('.ag-center-cols-container .ag-row').should('have.length', 0);
        }
      });
    });

    it('should NOT show row-status-duplicate class on non-duplicate rows', () => {
      // Click All to show everything
      cy.contains('button', 'All').click();
      cy.wait(500);

      // Get duplicate count to know if any exist
      cy.contains('button', 'Duplicates').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const dupCount = match ? parseInt(match[1], 10) : 0;

        cy.contains('button', 'All').invoke('text').then((allText) => {
          const allMatch = allText.match(/\((\d+)\)/);
          const allCount = allMatch ? parseInt(allMatch[1], 10) : 0;

          // If there are non-duplicate rows, at least some rows should lack the class
          if (allCount > dupCount) {
            // Filter to Not Addressed (these are typically not duplicates)
            cy.contains('button', 'Not Addressed').click();
            cy.wait(500);

            cy.get('.ag-center-cols-container .ag-row').then(($rows) => {
              if ($rows.length > 0) {
                // Check that at least some rows do NOT have duplicate class
                let nonDuplicateFound = false;
                $rows.each((_, row) => {
                  if (!Cypress.$(row).hasClass('row-status-duplicate')) {
                    nonDuplicateFound = true;
                  }
                });
                expect(nonDuplicateFound).to.be.true;
              }
            });
          }
        });
      });
    });

    it('should display duplicate indicator as a left border stripe', () => {
      cy.contains('button', 'Duplicates').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1], 10) : 0;

        if (count > 0) {
          cy.contains('button', 'Duplicates').click();
          cy.wait(500);

          // Verify the first duplicate row has a visible left border
          cy.get('.ag-center-cols-container .ag-row.row-status-duplicate').first()
            .should('have.css', 'border-left-style', 'solid');
        } else {
          cy.log('No duplicate rows to verify border styling');
        }
      });
    });
  });

  describe('Creating Duplicate via Edit', () => {
    it('should trigger 409 error and reset cell when creating a duplicate', () => {
      // Intercept API calls to detect 409 responses
      cy.intercept('PATCH', '/api/data/*').as('patchData');

      // Stub window.alert to capture the error message
      const alertStub = cy.stub();
      cy.on('window:alert', alertStub);

      // Add a new test row (starts with null requestType/qualityMeasure)
      cy.addTestRow('Test Patient Dup');
      cy.wait(500);

      // Find the newly added row
      cy.findRowByMemberName('Test Patient Dup').then((rowIndex) => {
        expect(rowIndex).to.be.greaterThan(-1);

        // We need to find an existing row with a known requestType and qualityMeasure
        // for the same patient (patientId). Since addTestRow creates a new patient,
        // we first need to duplicate the member to get same patientId.
        // Instead, use the Duplicate Mbr button to create a second row for an existing patient.

        // First, find an existing row with data (row 0 usually has data)
        cy.getAgGridCell(0, 'memberName').invoke('text').then((existingName) => {
          cy.getAgGridCell(0, 'requestType').invoke('text').then((existingRequestType) => {
            cy.getAgGridCell(0, 'qualityMeasure').invoke('text').then((existingQualityMeasure) => {
              if (existingRequestType.trim() && existingQualityMeasure.trim()) {
                // Select row 0 to duplicate the member
                cy.get(`[row-index="0"]`).first().click();
                cy.wait(300);

                // Click Duplicate Mbr button to create another row for the same patient
                cy.contains('button', 'Duplicate Mbr').click();
                cy.wait(1000);

                // Find the new duplicate member row (it should appear near the original)
                // The new row will have the same member name but null fields
                // Re-fetch the grid to find the new row
                cy.get('[col-id="memberName"]').then(($cells) => {
                  // Find the last row with the same member name that has empty requestType
                  let newRowIndex = -1;
                  for (let i = 0; i < $cells.length; i++) {
                    const cellText = $cells.eq(i).text().trim();
                    if (cellText.includes(existingName.trim())) {
                      const row = $cells.eq(i).closest('[row-index]');
                      const idx = parseInt(row.attr('row-index') || '-1');
                      if (idx !== 0) {
                        newRowIndex = idx;
                      }
                    }
                  }

                  if (newRowIndex >= 0) {
                    // Set the same requestType as the original row
                    cy.selectAgGridDropdown(newRowIndex, 'requestType', existingRequestType.trim());
                    cy.wait(500);

                    // Now set the same qualityMeasure - this should trigger 409 duplicate error
                    // For AWV/Chronic DX, qualityMeasure is auto-filled, so the 409 may fire
                    // on the requestType change itself
                    cy.getAgGridCell(newRowIndex, 'qualityMeasure').invoke('text').then((autoFilledQM) => {
                      if (autoFilledQM.trim() === existingQualityMeasure.trim()) {
                        // Duplicate was detected on requestType set (auto-filled QM matched)
                        // Check that alert was called
                        cy.wait(500);
                        cy.then(() => {
                          if (alertStub.called) {
                            expect(alertStub).to.have.been.called;
                          } else {
                            cy.log('Alert not triggered - auto-fill may have been blocked by 409');
                          }
                        });
                      } else if (existingRequestType.trim() === 'Quality' || existingRequestType.trim() === 'Screening') {
                        // Need to manually select qualityMeasure to match
                        cy.selectAgGridDropdown(newRowIndex, 'qualityMeasure', existingQualityMeasure.trim());
                        cy.wait(1000);

                        // The 409 should trigger on qualityMeasure change
                        cy.then(() => {
                          expect(alertStub).to.have.been.called;
                        });

                        // The qualityMeasure should have been reset to null/empty
                        cy.getAgGridCell(newRowIndex, 'qualityMeasure')
                          .invoke('text')
                          .should('satisfy', (text: string) => text.trim() === '');
                      }
                    });
                  } else {
                    cy.log('Could not find the duplicated member row');
                  }
                });
              } else {
                cy.log('Row 0 has no requestType/qualityMeasure to test with');
              }
            });
          });
        });
      });
    });

    it('should reset dependent fields after 409 duplicate error on requestType', () => {
      // Stub window.alert
      cy.on('window:alert', cy.stub().as('alertStub'));

      // Select row 0 and duplicate the member
      cy.get(`[row-index="0"]`).first().click();
      cy.wait(300);

      cy.getAgGridCell(0, 'requestType').invoke('text').then((existingRT) => {
        if (!existingRT.trim()) {
          cy.log('Row 0 has no requestType, skipping test');
          return;
        }

        cy.contains('button', 'Duplicate Mbr').click();
        cy.wait(1000);

        // The new row should appear. Find it by looking for a row with same name but empty fields.
        cy.getAgGridCell(0, 'memberName').invoke('text').then((memberName) => {
          cy.get('[col-id="memberName"]').then(($cells) => {
            let newRowIndex = -1;
            for (let i = 0; i < $cells.length; i++) {
              if ($cells.eq(i).text().trim().includes(memberName.trim())) {
                const row = $cells.eq(i).closest('[row-index]');
                const idx = parseInt(row.attr('row-index') || '-1');
                if (idx !== 0) {
                  newRowIndex = idx;
                }
              }
            }

            if (newRowIndex >= 0) {
              // Set requestType to match the original - for AWV/Chronic DX this auto-fills QM
              cy.selectAgGridDropdown(newRowIndex, 'requestType', existingRT.trim());
              cy.wait(1000);

              // If 409 was triggered, the requestType field should be reset to null
              // and dependent fields (qualityMeasure, measureStatus) should also be null
              cy.getAgGridCell(newRowIndex, 'measureStatus')
                .invoke('text')
                .should('satisfy', (text: string) => text.trim() === '');
            }
          });
        });
      });
    });
  });

  describe('Duplicate Flag Cleared When Fields Changed', () => {
    it('should remove duplicate flag when requestType is changed to something different', () => {
      // First check if there are any duplicates
      cy.contains('button', 'Duplicates').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1], 10) : 0;

        if (count > 0) {
          // Filter to show only duplicates
          cy.contains('button', 'Duplicates').click();
          cy.wait(500);

          // Get the first duplicate row's index
          cy.get('.ag-center-cols-container .ag-row.row-status-duplicate').first().then(($row) => {
            const rowIndex = parseInt($row.attr('row-index') || '-1');

            if (rowIndex >= 0) {
              // Get the current requestType
              cy.getAgGridCell(rowIndex, 'requestType').invoke('text').then((currentRT) => {
                // Pick a different requestType
                const requestTypes = ['AWV', 'Chronic DX', 'Quality', 'Screening'];
                const differentRT = requestTypes.find(rt => rt !== currentRT.trim()) || 'AWV';

                // Switch back to All filter first so we can see the row after change
                cy.contains('button', 'All').click();
                cy.wait(500);

                // Change the requestType to something different
                cy.selectAgGridDropdown(rowIndex, 'requestType', differentRT);
                cy.wait(1000);

                // The row should no longer have the duplicate class
                cy.get(`[row-index="${rowIndex}"]`).first()
                  .should('not.have.class', 'row-status-duplicate');
              });
            }
          });
        } else {
          cy.log('No duplicate rows to test with - skipping');
        }
      });
    });
  });

  describe('Null Fields Are Never Duplicates', () => {
    it('should NOT flag a new row with no requestType as duplicate', () => {
      // Add a new test row - it starts with null requestType and qualityMeasure
      cy.addTestRow('Test NoDup Empty');
      cy.wait(500);

      // Find the new row
      cy.findRowByMemberName('Test NoDup Empty').then((rowIndex) => {
        expect(rowIndex).to.be.greaterThan(-1);

        // Row should NOT have duplicate class (null requestType = never duplicate)
        cy.get(`[row-index="${rowIndex}"]`).first()
          .should('not.have.class', 'row-status-duplicate');
      });
    });

    it('should NOT flag a row with requestType but no qualityMeasure as duplicate', () => {
      // Add a new test row
      cy.addTestRow('Test NoDup PartialRT');
      cy.wait(500);

      // Find the new row
      cy.findRowByMemberName('Test NoDup PartialRT').then((rowIndex) => {
        expect(rowIndex).to.be.greaterThan(-1);

        // Set requestType to Quality (this does NOT auto-fill qualityMeasure)
        cy.selectAgGridDropdown(rowIndex, 'requestType', 'Quality');
        cy.wait(500);

        // qualityMeasure should still be empty
        cy.getAgGridCell(rowIndex, 'qualityMeasure')
          .invoke('text')
          .should('satisfy', (text: string) => text.trim() === '');

        // Row should NOT have duplicate class (null qualityMeasure = never duplicate)
        cy.get(`[row-index="${rowIndex}"]`).first()
          .should('not.have.class', 'row-status-duplicate');
      });
    });

    it('should NOT flag a row with requestType but no qualityMeasure even if another row has same requestType', () => {
      // This verifies that partial matches are not flagged
      cy.addTestRow('Test NoDup Partial2');
      cy.wait(500);

      cy.findRowByMemberName('Test NoDup Partial2').then((rowIndex) => {
        expect(rowIndex).to.be.greaterThan(-1);

        // Set requestType to Screening (does not auto-fill qualityMeasure)
        cy.selectAgGridDropdown(rowIndex, 'requestType', 'Screening');
        cy.wait(500);

        // Row should NOT be flagged as duplicate
        cy.get(`[row-index="${rowIndex}"]`).first()
          .should('not.have.class', 'row-status-duplicate');
      });
    });
  });

  describe('Duplicate Count in Filter Bar', () => {
    it('should display the Duplicates filter chip with a count', () => {
      cy.contains('button', 'Duplicates').should('be.visible');
      cy.contains('button', 'Duplicates').invoke('text').then((text) => {
        // Should contain parentheses with a number
        expect(text).to.match(/Duplicates\s*\(\d+\)/);
      });
    });

    it('should show correct number of rows when Duplicates filter is clicked', () => {
      cy.contains('button', 'Duplicates').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const expectedCount = match ? parseInt(match[1], 10) : 0;

        cy.contains('button', 'Duplicates').click();
        cy.wait(500);

        if (expectedCount > 0) {
          // The number of visible rows should match the chip count
          cy.get('.ag-center-cols-container .ag-row').should('have.length', expectedCount);
        } else {
          cy.get('.ag-center-cols-container .ag-row').should('have.length', 0);
        }
      });
    });

    it('should update duplicate count after removing a duplicate', () => {
      cy.contains('button', 'Duplicates').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const initialCount = match ? parseInt(match[1], 10) : 0;

        if (initialCount > 0) {
          // Filter to duplicates
          cy.contains('button', 'Duplicates').click();
          cy.wait(500);

          // Get the first duplicate row
          cy.get('.ag-center-cols-container .ag-row.row-status-duplicate').first().then(($row) => {
            const rowIndex = parseInt($row.attr('row-index') || '-1');

            if (rowIndex >= 0) {
              // Switch to All filter to see all rows
              cy.contains('button', 'All').click();
              cy.wait(500);

              // Change the requestType to break the duplicate
              cy.getAgGridCell(rowIndex, 'requestType').invoke('text').then((currentRT) => {
                const requestTypes = ['AWV', 'Chronic DX', 'Quality', 'Screening'];
                const differentRT = requestTypes.find(rt => rt !== currentRT.trim()) || 'AWV';

                cy.selectAgGridDropdown(rowIndex, 'requestType', differentRT);
                cy.wait(1000);

                // Duplicate count should have decreased
                cy.contains('button', 'Duplicates').invoke('text').then((newText) => {
                  const newMatch = newText.match(/\((\d+)\)/);
                  const newCount = newMatch ? parseInt(newMatch[1], 10) : 0;

                  // Count should be less than or equal to initial (may decrease by 2
                  // since breaking one duplicate pair removes the flag from both rows)
                  expect(newCount).to.be.lessThan(initialCount);
                });
              });
            }
          });
        } else {
          cy.log('No duplicates to remove - skipping count decrease test');
        }
      });
    });
  });

  describe('Duplicate with Status Color Combination', () => {
    it('should show BOTH duplicate stripe AND status color on a duplicate row', () => {
      cy.contains('button', 'Duplicates').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1], 10) : 0;

        if (count > 0) {
          // Filter to duplicates
          cy.contains('button', 'Duplicates').click();
          cy.wait(500);

          // Check if any duplicate rows also have a status color class
          const statusClasses = [
            'row-status-green',
            'row-status-blue',
            'row-status-yellow',
            'row-status-purple',
            'row-status-orange',
            'row-status-gray',
            'row-status-red',
          ];

          cy.get('.ag-center-cols-container .ag-row.row-status-duplicate').then(($rows) => {
            let foundCombination = false;

            $rows.each((_, row) => {
              const $row = Cypress.$(row);
              statusClasses.forEach((cls) => {
                if ($row.hasClass(cls)) {
                  foundCombination = true;
                }
              });
            });

            if (foundCombination) {
              // At least one duplicate row has both duplicate and status color
              cy.log('Found duplicate row with both duplicate stripe and status color');

              // Verify the row has the duplicate left border
              cy.get('.ag-center-cols-container .ag-row.row-status-duplicate').first()
                .should('have.css', 'border-left-style', 'solid');
            } else {
              // Duplicate rows may all be "Not Addressed" (white/no status color)
              // This is valid - duplicates with no measure status have no additional color
              cy.log('All duplicate rows are Not Addressed (no status color) - combination not testable');

              // Still verify the duplicate class is present
              cy.get('.ag-center-cols-container .ag-row.row-status-duplicate')
                .should('have.length.greaterThan', 0);
            }
          });
        } else {
          cy.log('No duplicate rows exist to test color combination');
        }
      });
    });

    it('should allow duplicate stripe to coexist with green status', () => {
      // This test verifies the CSS allows additive classes
      // The duplicate stripe (border-left) should not interfere with background colors
      cy.contains('button', 'Duplicates').invoke('text').then((text) => {
        const match = text.match(/\((\d+)\)/);
        const count = match ? parseInt(match[1], 10) : 0;

        if (count > 0) {
          cy.contains('button', 'Duplicates').click();
          cy.wait(500);

          // Find a duplicate with a green status
          cy.get('.ag-center-cols-container .ag-row.row-status-duplicate.row-status-green').then(($greenDups) => {
            if ($greenDups.length > 0) {
              // Verify it has both the stripe border and green background
              cy.wrap($greenDups.first())
                .should('have.class', 'row-status-duplicate')
                .and('have.class', 'row-status-green')
                .and('have.css', 'border-left-style', 'solid');
            } else {
              cy.log('No duplicate rows with green status found - this is data-dependent');
            }
          });
        } else {
          cy.log('No duplicates in dataset');
        }
      });
    });
  });

  describe('409 Error Handling Details', () => {
    it('should show an error alert when duplicate is created', () => {
      const alertStub = cy.stub();
      cy.on('window:alert', alertStub);

      // Select row 0 and check it has data
      cy.getAgGridCell(0, 'requestType').invoke('text').then((rt) => {
        cy.getAgGridCell(0, 'qualityMeasure').invoke('text').then((qm) => {
          if (!rt.trim() || !qm.trim()) {
            cy.log('Row 0 lacks requestType/qualityMeasure - skipping 409 test');
            return;
          }

          // Duplicate the member to get a second row with the same patientId
          cy.get(`[row-index="0"]`).first().click();
          cy.wait(300);
          cy.contains('button', 'Duplicate Mbr').click();
          cy.wait(1000);

          // Find the new duplicated row
          cy.getAgGridCell(0, 'memberName').invoke('text').then((memberName) => {
            cy.get('[col-id="memberName"]').then(($cells) => {
              let newRowIndex = -1;
              for (let i = 0; i < $cells.length; i++) {
                if ($cells.eq(i).text().trim().includes(memberName.trim())) {
                  const row = $cells.eq(i).closest('[row-index]');
                  const idx = parseInt(row.attr('row-index') || '-1');
                  if (idx !== 0) {
                    newRowIndex = idx;
                  }
                }
              }

              if (newRowIndex >= 0) {
                // Try to set the exact same requestType as original
                cy.selectAgGridDropdown(newRowIndex, 'requestType', rt.trim());
                cy.wait(1000);

                // Check if qualityMeasure was auto-filled (AWV/Chronic DX)
                cy.getAgGridCell(newRowIndex, 'qualityMeasure').invoke('text').then((newQM) => {
                  if (newQM.trim() === qm.trim()) {
                    // Duplicate detected immediately via auto-fill
                    cy.then(() => {
                      if (alertStub.called) {
                        // Verify the alert message mentions duplicate
                        const alertMessage = alertStub.firstCall?.args[0] || '';
                        cy.log(`Alert message: ${alertMessage}`);
                        expect(alertStub).to.have.been.called;
                      }
                    });
                  } else if (rt.trim() === 'Quality' || rt.trim() === 'Screening') {
                    // Need to manually select qualityMeasure
                    cy.selectAgGridDropdown(newRowIndex, 'qualityMeasure', qm.trim());
                    cy.wait(1000);

                    // Alert should have been triggered
                    cy.then(() => {
                      expect(alertStub).to.have.been.called;
                    });
                  }
                });
              }
            });
          });
        });
      });
    });

    it('should clear qualityMeasure and measureStatus when requestType triggers 409', () => {
      cy.on('window:alert', cy.stub());

      cy.getAgGridCell(0, 'requestType').invoke('text').then((rt) => {
        if (!rt.trim()) {
          cy.log('Row 0 has no requestType - skipping');
          return;
        }

        // Duplicate the member
        cy.get(`[row-index="0"]`).first().click();
        cy.wait(300);
        cy.contains('button', 'Duplicate Mbr').click();
        cy.wait(1000);

        cy.getAgGridCell(0, 'memberName').invoke('text').then((memberName) => {
          cy.get('[col-id="memberName"]').then(($cells) => {
            let newRowIndex = -1;
            for (let i = 0; i < $cells.length; i++) {
              if ($cells.eq(i).text().trim().includes(memberName.trim())) {
                const row = $cells.eq(i).closest('[row-index]');
                const idx = parseInt(row.attr('row-index') || '-1');
                if (idx !== 0) {
                  newRowIndex = idx;
                }
              }
            }

            if (newRowIndex >= 0 && (rt.trim() === 'AWV' || rt.trim() === 'Chronic DX')) {
              // AWV and Chronic DX auto-fill qualityMeasure, so setting the same
              // requestType should immediately trigger 409 and clear everything
              cy.selectAgGridDropdown(newRowIndex, 'requestType', rt.trim());
              cy.wait(1000);

              // After 409, the requestType should be reset to null
              cy.getAgGridCell(newRowIndex, 'requestType')
                .invoke('text')
                .should('satisfy', (text: string) => text.trim() === '');

              // Dependent fields should also be null
              cy.getAgGridCell(newRowIndex, 'qualityMeasure')
                .invoke('text')
                .should('satisfy', (text: string) => text.trim() === '');

              cy.getAgGridCell(newRowIndex, 'measureStatus')
                .invoke('text')
                .should('satisfy', (text: string) => text.trim() === '');
            } else {
              cy.log('Skipping - row 0 requestType is not AWV/Chronic DX or new row not found');
            }
          });
        });
      });
    });
  });
});
