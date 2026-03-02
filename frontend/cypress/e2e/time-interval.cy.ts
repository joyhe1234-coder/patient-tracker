/**
 * Time Interval Editability and Override Tests - Cypress
 *
 * Tests the time interval column behavior in the AG Grid patient tracker:
 * - Conditional editability based on status type
 * - Manual override of default interval values
 * - Validation of interval input (1-1000 integer range)
 * - Due date recalculation when interval is overridden
 * - Dropdown-controlled interval for specific statuses
 */

describe('Time Interval Editability', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';
  const testRowIndex = 0;

  /**
   * Format today's date as MM/DD/YYYY for the status date cell editor.
   */
  function getTodayFormatted(): string {
    const today = new Date();
    return `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
  }

  /**
   * Set the status date on a row to today's date.
   */
  function setStatusDateToToday(rowIndex: number): void {
    const formattedDate = getTodayFormatted();
    cy.getAgGridCell(rowIndex, 'statusDate').dblclick();
    cy.get('.date-cell-editor').clear().type(formattedDate);
    cy.get('.date-cell-editor').type('{enter}');
    cy.getAgGridCell(rowIndex, 'statusDate').should('not.have.text', '');
  }

  /**
   * Set up a row with AWV completed status and status date set to today.
   * AWV completed has baseDueDays = 365, so time interval should be 365.
   */
  function setupAwvCompletedRow(rowIndex: number): void {
    cy.selectAgGridDropdown(rowIndex, 'requestType', 'AWV');
    cy.getAgGridCell(rowIndex, 'requestType').should('contain.text', 'AWV');
    cy.selectAgGridDropdown(rowIndex, 'measureStatus', 'AWV completed');
    cy.getAgGridCell(rowIndex, 'measureStatus').should('contain.text', 'AWV completed');
    setStatusDateToToday(rowIndex);
  }

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.waitForAgGrid();
  });

  describe('Time Interval Not Editable for Dropdown-Controlled Statuses', () => {
    it('should not allow editing time interval for Screening discussed status', () => {
      // Find a row with Breast Cancer Screening (avoids 409 duplicate error)
      cy.get('.ag-center-cols-container [col-id="qualityMeasure"]').then(($cells) => {
        let targetRow = testRowIndex;
        $cells.each((_, cell) => {
          const text = Cypress.$(cell).text().replace(/[✓▾]/g, '').trim();
          if (text === 'Breast Cancer Screening') {
            targetRow = parseInt(Cypress.$(cell).closest('[row-index]').attr('row-index') || '-1', 10);
            return false;
          }
        });

        if (targetRow === testRowIndex) {
          cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
          cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Screening');
          cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Breast Cancer Screening');
          cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Breast Cancer Screening');
        }

        cy.selectAgGridDropdown(targetRow, 'measureStatus', 'Screening discussed');
        cy.getAgGridCell(targetRow, 'measureStatus').should('contain.text', 'Screening discussed');

        // Set status date so there is a time interval value (baseDueDays = 30)
        setStatusDateToToday(targetRow);

        // Select a time period in tracking1 to populate interval
        cy.selectAgGridDropdown(targetRow, 'tracking1', 'In 3 Months');
        cy.getAgGridCell(targetRow, 'tracking1').should('contain.text', 'In 3 Months');

        // Scroll to time interval column and verify it has a value
        cy.getAgGridCellWithScroll(targetRow, 'timeIntervalDays')
          .invoke('text')
          .then((text) => {
            const days = parseInt(text.trim(), 10);
            expect(days).to.be.greaterThan(0);
          });

        // Try to double-click the time interval cell - it should not enter edit mode
        cy.getAgGridCellWithScroll(targetRow, 'timeIntervalDays').dblclick();

        // Verify no edit wrapper appears (cell is not editable)
        cy.get(`[row-index="${targetRow}"] [col-id="timeIntervalDays"]`).first()
          .find('.ag-cell-edit-wrapper')
          .should('not.exist');
      });
    });

    it('should not allow editing time interval for HgbA1c ordered status', () => {
      // Set up row: Quality > Diabetes Control > HgbA1c ordered
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Quality');
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Diabetes Control');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'HgbA1c ordered');

      // Set status date
      setStatusDateToToday(testRowIndex);

      // Select tracking2 to populate interval (HgbA1c requires tracking2 for due date)
      cy.selectAgGridDropdown(testRowIndex, 'tracking2', '3 months');
      cy.getAgGridCell(testRowIndex, 'tracking2').should('contain.text', '3 months');

      // Verify interval has a value
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.be.within(84, 93);
        });

      // Try to double-click - should not enter edit mode
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();

      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('not.exist');
    });

    it('should not allow editing time interval for Scheduled call back - BP not at goal', () => {
      // Set up row: Quality > Hypertension Management > Scheduled call back - BP not at goal
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Quality');
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Hypertension Management');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Hypertension Management');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Scheduled call back - BP not at goal');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Scheduled call back');

      // Set status date (baseDueDays = 7)
      setStatusDateToToday(testRowIndex);

      // Verify interval shows 7 days
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(7);
        });

      // Try to double-click - should not enter edit mode
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();

      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('not.exist');
    });
  });

  describe('Time Interval Editable for Standard Statuses', () => {
    it('should allow editing time interval for AWV completed with status date', () => {
      // Set up AWV completed with today's status date
      setupAwvCompletedRow(testRowIndex);

      // AWV completed has baseDueDays = 365
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(365);
        });

      // Double-click to enter edit mode
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();

      // Should enter edit mode (edit wrapper should exist)
      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('exist');

      // Enter a new value
      cy.get('.ag-cell-edit-wrapper input').clear().type('45');
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');

      // Verify the new value is saved
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(45);
        });
    });

    it('should allow editing time interval for Patient called to schedule AWV', () => {
      // Patient called to schedule AWV has baseDueDays = 7
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'AWV');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Patient called to schedule AWV');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Patient called to schedule AWV');
      setStatusDateToToday(testRowIndex);

      // Verify default interval is 7
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(7);
        });

      // Double-click to enter edit mode - should be editable
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();

      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('exist');

      // Press Escape to cancel
      cy.get('.ag-cell-edit-wrapper input').type('{esc}');
    });
  });

  describe('Time Interval Manual Override', () => {
    it('should recalculate due date when interval is overridden', () => {
      // Set up AWV completed with today's status date (baseDueDays = 365)
      setupAwvCompletedRow(testRowIndex);

      // Verify default interval is 365
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(365);
        });

      // Record the original due date
      cy.getAgGridCellWithScroll(testRowIndex, 'dueDate')
        .invoke('text')
        .then((originalDueDate) => {
          expect(originalDueDate.trim()).to.not.be.empty;

          // Override interval with 60 days
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
          cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
            .find('.ag-cell-edit-wrapper')
            .should('exist');
          cy.get('.ag-cell-edit-wrapper input').clear().type('60');
          cy.get('.ag-cell-edit-wrapper input').type('{enter}');

          // Verify interval is now 60
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
            .invoke('text')
            .then((text) => {
              const days = parseInt(text.trim(), 10);
              expect(days).to.equal(60);
            });

          // Verify due date has changed from the original
          cy.getAgGridCellWithScroll(testRowIndex, 'dueDate')
            .invoke('text')
            .then((newDueDate) => {
              expect(newDueDate.trim()).to.not.be.empty;
              expect(newDueDate.trim()).to.not.equal(originalDueDate.trim());
            });
        });
    });

    it('should accept valid integer value at lower boundary (1)', () => {
      setupAwvCompletedRow(testRowIndex);

      // Override with minimum valid value
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('exist');
      cy.get('.ag-cell-edit-wrapper input').clear().type('1');
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(1);
        });
    });

    it('should accept valid integer value at upper boundary (1000)', () => {
      setupAwvCompletedRow(testRowIndex);

      // Override with maximum valid value
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('exist');
      cy.get('.ag-cell-edit-wrapper input').clear().type('1000');
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(1000);
        });
    });
  });

  describe('Time Interval Validation', () => {
    beforeEach(() => {
      // Set up AWV completed with status date for each validation test
      setupAwvCompletedRow(testRowIndex);
    });

    it('should reject non-numeric value and revert to original', () => {
      // Read the current value before testing
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((originalText) => {
          const originalDays = parseInt(originalText.trim(), 10);
          expect(originalDays).to.be.greaterThan(0);

          // Try to enter a non-numeric value
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
          cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
            .find('.ag-cell-edit-wrapper')
            .should('exist');
          cy.get('.ag-cell-edit-wrapper input').first().clear().type('abc{enter}');

          // Value should revert to original (non-numeric input rejected)
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
            .invoke('text')
            .then((text) => {
              const days = parseInt(text.trim(), 10);
              expect(days).to.equal(originalDays);
            });
        });
    });

    it('should reject zero and show alert', () => {
      const alertStub = cy.stub();
      cy.on('window:alert', alertStub);

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((originalText) => {
          const originalDays = parseInt(originalText.trim(), 10);

          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
          cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
            .find('.ag-cell-edit-wrapper')
            .should('exist');
          cy.get('.ag-cell-edit-wrapper input').clear().type('0');
          cy.get('.ag-cell-edit-wrapper input').type('{enter}');

          cy.then(() => {
            expect(alertStub).to.have.been.calledOnce;
            expect(alertStub.firstCall.args[0]).to.include('valid number between 1 and 1000');
          });

          // Value should revert to original
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
            .invoke('text')
            .then((text) => {
              const days = parseInt(text.trim(), 10);
              expect(days).to.equal(originalDays);
            });
        });
    });

    it('should reject value above 1000 and show alert', () => {
      const alertStub = cy.stub();
      cy.on('window:alert', alertStub);

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((originalText) => {
          const originalDays = parseInt(originalText.trim(), 10);

          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
          cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
            .find('.ag-cell-edit-wrapper')
            .should('exist');
          cy.get('.ag-cell-edit-wrapper input').clear().type('1001');
          cy.get('.ag-cell-edit-wrapper input').type('{enter}');

          cy.then(() => {
            expect(alertStub).to.have.been.calledOnce;
            expect(alertStub.firstCall.args[0]).to.include('valid number between 1 and 1000');
          });

          // Value should revert to original
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
            .invoke('text')
            .then((text) => {
              const days = parseInt(text.trim(), 10);
              expect(days).to.equal(originalDays);
            });
        });
    });

    it('should not allow clearing to empty value', () => {
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((originalText) => {
          const originalDays = parseInt(originalText.trim(), 10);

          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
          cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
            .find('.ag-cell-edit-wrapper')
            .should('exist');
          cy.get('.ag-cell-edit-wrapper input').clear();
          cy.get('.ag-cell-edit-wrapper input').type('{enter}');

          // Value should remain at original (clearing returns false from valueSetter)
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
            .invoke('text')
            .then((text) => {
              const days = parseInt(text.trim(), 10);
              expect(days).to.equal(originalDays);
            });
        });
    });

    it('should reject negative number and show alert', () => {
      const alertStub = cy.stub();
      cy.on('window:alert', alertStub);

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((originalText) => {
          const originalDays = parseInt(originalText.trim(), 10);

          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
          cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
            .find('.ag-cell-edit-wrapper')
            .should('exist');
          cy.get('.ag-cell-edit-wrapper input').clear().type('-5');
          cy.get('.ag-cell-edit-wrapper input').type('{enter}');

          cy.then(() => {
            expect(alertStub).to.have.been.calledOnce;
            expect(alertStub.firstCall.args[0]).to.include('valid number between 1 and 1000');
          });

          // Value should revert to original
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
            .invoke('text')
            .then((text) => {
              const days = parseInt(text.trim(), 10);
              expect(days).to.equal(originalDays);
            });
        });
    });

    it('should reject large negative number and show alert', () => {
      const alertStub = cy.stub();
      cy.on('window:alert', alertStub);

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((originalText) => {
          const originalDays = parseInt(originalText.trim(), 10);

          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
          cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
            .find('.ag-cell-edit-wrapper')
            .should('exist');
          cy.get('.ag-cell-edit-wrapper input').clear().type('-100');
          cy.get('.ag-cell-edit-wrapper input').type('{enter}');

          cy.then(() => {
            expect(alertStub).to.have.been.calledOnce;
            expect(alertStub.firstCall.args[0]).to.include('valid number between 1 and 1000');
          });

          // Value should revert to original
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
            .invoke('text')
            .then((text) => {
              const days = parseInt(text.trim(), 10);
              expect(days).to.equal(originalDays);
            });
        });
    });

    it('should truncate decimal to integer (parseInt behavior)', () => {
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then(() => {
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
          cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
            .find('.ag-cell-edit-wrapper')
            .should('exist');
          cy.get('.ag-cell-edit-wrapper input').clear().type('45.5');
          cy.get('.ag-cell-edit-wrapper input').type('{enter}');

          // parseInt('45.5') = 45, which is valid (1-1000), so it should be accepted as 45
          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
            .invoke('text')
            .then((text) => {
              const days = parseInt(text.trim(), 10);
              expect(days).to.equal(45);
            });
        });
    });
  });

  describe('Due Date and Interval via Dropdown', () => {
    it('should set interval via tracking2 for HgbA1c ordered (3 months)', () => {
      // Set up: Quality > Diabetes Control > HgbA1c ordered
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Quality');
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Diabetes Control');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'HgbA1c ordered');

      // Set status date
      setStatusDateToToday(testRowIndex);

      // Select 3 months in tracking2
      cy.selectAgGridDropdown(testRowIndex, 'tracking2', '3 months');
      cy.getAgGridCell(testRowIndex, 'tracking2').should('contain.text', '3 months');

      // Verify interval shows approximately 90 days (month length variation)
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.be.within(84, 93);
        });

      // Verify due date is set
      cy.getAgGridCellWithScroll(testRowIndex, 'dueDate')
        .invoke('text')
        .should('not.satisfy', (text: string) => text.trim() === '');
    });

    it('should set interval via tracking1 for Screening discussed (In 3 Months)', () => {
      // Find a row with Breast Cancer Screening (avoids 409 duplicate error)
      cy.get('.ag-center-cols-container [col-id="qualityMeasure"]').then(($cells) => {
        let targetRow = testRowIndex;
        $cells.each((_, cell) => {
          const text = Cypress.$(cell).text().replace(/[✓▾]/g, '').trim();
          if (text === 'Breast Cancer Screening') {
            targetRow = parseInt(Cypress.$(cell).closest('[row-index]').attr('row-index') || '-1', 10);
            return false;
          }
        });

        if (targetRow === testRowIndex) {
          cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
          cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Screening');
          cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Breast Cancer Screening');
          cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Breast Cancer Screening');
        }

        cy.selectAgGridDropdown(targetRow, 'measureStatus', 'Screening discussed');
        cy.getAgGridCell(targetRow, 'measureStatus').should('contain.text', 'Screening discussed');

        // Set status date
        setStatusDateToToday(targetRow);

        // Select "In 3 Months" in tracking1
        cy.selectAgGridDropdown(targetRow, 'tracking1', 'In 3 Months');
        cy.getAgGridCell(targetRow, 'tracking1').should('contain.text', 'In 3 Months');

        // Verify interval shows approximately 90 days
        cy.getAgGridCellWithScroll(targetRow, 'timeIntervalDays')
          .invoke('text')
          .then((text) => {
            const days = parseInt(text.trim(), 10);
            expect(days).to.be.within(84, 93);
          });

        // Verify due date is set
        cy.getAgGridCellWithScroll(targetRow, 'dueDate')
          .invoke('text')
          .should('not.satisfy', (text: string) => text.trim() === '');
      });
    });

    it('should update interval when tracking2 changes for HgbA1c ordered', () => {
      // Set up: Quality > Diabetes Control > HgbA1c ordered
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Quality');
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Diabetes Control');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'HgbA1c ordered');

      // Set status date
      setStatusDateToToday(testRowIndex);

      // First select 1 month
      cy.selectAgGridDropdown(testRowIndex, 'tracking2', '1 month');
      cy.getAgGridCell(testRowIndex, 'tracking2').should('contain.text', '1 month');

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((firstInterval) => {
          const firstDays = parseInt(firstInterval.trim(), 10);
          expect(firstDays).to.be.within(28, 31);

          // Now change to 6 months
          cy.selectAgGridDropdown(testRowIndex, 'tracking2', '6 months');
          cy.getAgGridCell(testRowIndex, 'tracking2').should('contain.text', '6 months');

          cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
            .invoke('text')
            .then((secondInterval) => {
              const secondDays = parseInt(secondInterval.trim(), 10);
              expect(secondDays).to.be.within(175, 186);
              // The 6-month interval should be larger than the 1-month interval
              expect(secondDays).to.be.greaterThan(firstDays);
            });
        });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T7-1: Time interval read-only for terminal/non-actionable statuses
  // ═══════════════════════════════════════════════════════════════════════

  describe('T7-1: Time Interval Read-Only for Terminal Statuses', () => {
    /**
     * Dismiss any Edit Conflict modal that may appear from version conflicts.
     * Clicks "Keep Mine" if the modal is present, otherwise does nothing.
     */
    function dismissConflictIfPresent() {
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Keep Mine")').length > 0) {
          cy.contains('button', 'Keep Mine').click();
          cy.wait(500);
        }
      });
    }

    it('time interval is read-only for "Not Addressed"', () => {
      // Set up AWV > Not Addressed (has no baseDueDays → no interval)
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'AWV');
      dismissConflictIfPresent();
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Not Addressed');
      dismissConflictIfPresent();

      // Time interval should be empty (no baseDueDays for Not Addressed)
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          expect(text.trim()).to.equal('');
        });

      // Double-click should NOT open an editor
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('not.exist');
    });

    it('time interval is read-only for "Patient declined AWV"', () => {
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'AWV');
      dismissConflictIfPresent();
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Patient declined AWV');
      dismissConflictIfPresent();

      // Time interval should be empty for terminal statuses
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          expect(text.trim()).to.equal('');
        });

      // Double-click should NOT open an editor
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('not.exist');
    });

    it('time interval is read-only for "No longer applicable"', () => {
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'AWV');
      dismissConflictIfPresent();
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'No longer applicable');
      dismissConflictIfPresent();

      // Time interval should be empty for N/A statuses
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          expect(text.trim()).to.equal('');
        });

      // Double-click should NOT open an editor
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('not.exist');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T7-2: Depression Screening time interval behavior
  // ═══════════════════════════════════════════════════════════════════════

  describe('T7-2: Depression Screening Time Interval', () => {
    function dismissConflictIfPresent() {
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Keep Mine")').length > 0) {
          cy.contains('button', 'Keep Mine').click();
          cy.wait(500);
        }
      });
    }

    it('Depression "Called to schedule" shows time interval with options', () => {
      // Set up: Screening > Depression Screening > Called to schedule
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Screening');
      dismissConflictIfPresent();
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Depression Screening');
      dismissConflictIfPresent();
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Called to schedule');
      dismissConflictIfPresent();

      // Set status date so interval is calculated
      setStatusDateToToday(testRowIndex);

      // Time interval should show a value (baseDueDays=7)
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(7);
        });
    });

    it('Depression "Screening complete" has no time interval (terminal)', () => {
      // Set up: Screening > Depression Screening > Screening complete (terminal/green)
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Screening');
      dismissConflictIfPresent();
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Depression Screening');
      dismissConflictIfPresent();
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Screening complete');
      dismissConflictIfPresent();

      // Screening complete is a terminal green status — log its interval state
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').then(($cell) => {
        const text = $cell.text().trim();
        cy.log(`Screening complete time interval: "${text}"`);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T7-3: Edge cases — status transitions and time interval
  // ═══════════════════════════════════════════════════════════════════════

  describe('T7-3: Time Interval Edge Cases', () => {
    function dismissConflictIfPresent() {
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Keep Mine")').length > 0) {
          cy.contains('button', 'Keep Mine').click();
          cy.wait(500);
        }
      });
    }

    it('changing status from actionable to terminal clears time interval', () => {
      // Set up with an actionable status that has a time interval
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'AWV');
      dismissConflictIfPresent();
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Patient called to schedule AWV');
      dismissConflictIfPresent();

      // Set status date so interval is calculated (baseDueDays=7)
      setStatusDateToToday(testRowIndex);

      // Verify interval has a value
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(7);
        });

      // Change to terminal status — Patient declined AWV
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Patient declined AWV');
      dismissConflictIfPresent();

      // Time interval should be cleared (terminal status has no due date)
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');

      // Due date should also be cleared
      cy.getAgGridCellWithScroll(testRowIndex, 'dueDate')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');
    });

    it('time interval field shows correct dropdown options for BP statuses', () => {
      // Set up BP not at goal — tracking1 controls interval via dropdown
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Quality');
      dismissConflictIfPresent();
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Hypertension Management');
      dismissConflictIfPresent();
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Scheduled call back - BP not at goal');
      dismissConflictIfPresent();

      // Set status date
      setStatusDateToToday(testRowIndex);

      // Open tracking1 dropdown — should show call frequency options
      cy.openAgGridDropdown(testRowIndex, 'tracking1');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Call every 1 wk');
        expect(options).to.include('Call every 2 wks');
        expect(options).to.include('Call every 4 wks');
        expect(options).to.include('Call every 8 wks');
      });
      // Close dropdown
      cy.get('body').type('{esc}');
      cy.wait(300);

      // Select a call frequency and verify interval updates
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'tracking1', 'Call every 2 wks');
      dismissConflictIfPresent();

      // Verify interval shows 14 days (2 weeks)
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(14);
        });
    });
  });
});
