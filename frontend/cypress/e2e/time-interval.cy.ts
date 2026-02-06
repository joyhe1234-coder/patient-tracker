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
  const adminEmail = 'admin2@gmail.com';
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
    cy.get('.ag-cell-edit-wrapper input').clear().type(formattedDate);
    cy.get('.ag-cell-edit-wrapper input').type('{enter}');
    cy.wait(1000);
  }

  /**
   * Set up a row with AWV completed status and status date set to today.
   * AWV completed has baseDueDays = 365, so time interval should be 365.
   */
  function setupAwvCompletedRow(rowIndex: number): void {
    cy.selectAgGridDropdown(rowIndex, 'requestType', 'AWV');
    cy.wait(300);
    cy.selectAgGridDropdown(rowIndex, 'measureStatus', 'AWV completed');
    cy.wait(300);
    setStatusDateToToday(rowIndex);
  }

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
    cy.visit('/');
    cy.waitForAgGrid();
  });

  describe('Time Interval Not Editable for Dropdown-Controlled Statuses', () => {
    it('should not allow editing time interval for Screening discussed status', () => {
      // Set up row: Screening > Breast Cancer Screening > Screening discussed
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Breast Cancer Screening');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Screening discussed');
      cy.wait(300);

      // Set status date so there is a time interval value (baseDueDays = 30)
      setStatusDateToToday(testRowIndex);

      // Select a time period in tracking1 to populate interval
      cy.selectAgGridDropdown(testRowIndex, 'tracking1', 'In 3 Months');
      cy.wait(1000);

      // Scroll to time interval column and verify it has a value
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.be.greaterThan(0);
        });

      // Try to double-click the time interval cell - it should not enter edit mode
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.wait(300);

      // Verify no edit wrapper appears (cell is not editable)
      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('not.exist');
    });

    it('should not allow editing time interval for HgbA1c ordered status', () => {
      // Set up row: Quality > Diabetes Control > HgbA1c ordered
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.wait(300);

      // Set status date
      setStatusDateToToday(testRowIndex);

      // Select tracking2 to populate interval (HgbA1c requires tracking2 for due date)
      cy.selectAgGridDropdown(testRowIndex, 'tracking2', '3 months');
      cy.wait(1000);

      // Verify interval has a value
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.be.within(84, 93);
        });

      // Try to double-click - should not enter edit mode
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.wait(300);

      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('not.exist');
    });

    it('should not allow editing time interval for Scheduled call back - BP not at goal', () => {
      // Set up row: Quality > Hypertension Management > Scheduled call back - BP not at goal
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Hypertension Management');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Scheduled call back - BP not at goal');
      cy.wait(300);

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
      cy.wait(300);

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
      cy.wait(300);

      // Should enter edit mode (edit wrapper should exist)
      cy.get(`[row-index="${testRowIndex}"] [col-id="timeIntervalDays"]`).first()
        .find('.ag-cell-edit-wrapper')
        .should('exist');

      // Enter a new value
      cy.get('.ag-cell-edit-wrapper input').clear().type('45');
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');
      cy.wait(500);

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
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Patient called to schedule AWV');
      cy.wait(300);
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
      cy.wait(300);

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
          cy.wait(300);
          cy.get('.ag-cell-edit-wrapper input').clear().type('60');
          cy.get('.ag-cell-edit-wrapper input').type('{enter}');
          cy.wait(1000);

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
      cy.wait(300);
      cy.get('.ag-cell-edit-wrapper input').clear().type('1');
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');
      cy.wait(500);

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
      cy.wait(300);
      cy.get('.ag-cell-edit-wrapper input').clear().type('1000');
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');
      cy.wait(500);

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

    it('should reject non-numeric value and show alert', () => {
      // Stub window.alert to capture the validation message
      const alertStub = cy.stub();
      cy.on('window:alert', alertStub);

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.wait(300);
      cy.get('.ag-cell-edit-wrapper input').clear().type('abc');
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');
      cy.wait(500);

      // Alert should have been called with validation message
      cy.then(() => {
        expect(alertStub).to.have.been.calledOnce;
        expect(alertStub.firstCall.args[0]).to.include('valid number between 1 and 1000');
      });

      // Value should revert to original (365)
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(365);
        });
    });

    it('should reject zero and show alert', () => {
      const alertStub = cy.stub();
      cy.on('window:alert', alertStub);

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.wait(300);
      cy.get('.ag-cell-edit-wrapper input').clear().type('0');
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');
      cy.wait(500);

      cy.then(() => {
        expect(alertStub).to.have.been.calledOnce;
        expect(alertStub.firstCall.args[0]).to.include('valid number between 1 and 1000');
      });

      // Value should revert to 365
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(365);
        });
    });

    it('should reject value above 1000 and show alert', () => {
      const alertStub = cy.stub();
      cy.on('window:alert', alertStub);

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.wait(300);
      cy.get('.ag-cell-edit-wrapper input').clear().type('1001');
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');
      cy.wait(500);

      cy.then(() => {
        expect(alertStub).to.have.been.calledOnce;
        expect(alertStub.firstCall.args[0]).to.include('valid number between 1 and 1000');
      });

      // Value should revert to 365
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(365);
        });
    });

    it('should not allow clearing to empty value', () => {
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays').dblclick();
      cy.wait(300);
      cy.get('.ag-cell-edit-wrapper input').clear();
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');
      cy.wait(500);

      // Value should remain at 365 (clearing returns false from valueSetter)
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(365);
        });
    });
  });

  describe('Due Date and Interval via Dropdown', () => {
    it('should set interval via tracking2 for HgbA1c ordered (3 months)', () => {
      // Set up: Quality > Diabetes Control > HgbA1c ordered
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.wait(300);

      // Set status date
      setStatusDateToToday(testRowIndex);

      // Select 3 months in tracking2
      cy.selectAgGridDropdown(testRowIndex, 'tracking2', '3 months');
      cy.wait(1500);

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
      // Set up: Screening > Breast Cancer Screening > Screening discussed
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Breast Cancer Screening');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Screening discussed');
      cy.wait(300);

      // Set status date
      setStatusDateToToday(testRowIndex);

      // Select "In 3 Months" in tracking1
      cy.selectAgGridDropdown(testRowIndex, 'tracking1', 'In 3 Months');
      cy.wait(1500);

      // Verify interval shows approximately 90 days
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

    it('should update interval when tracking2 changes for HgbA1c ordered', () => {
      // Set up: Quality > Diabetes Control > HgbA1c ordered
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.wait(300);

      // Set status date
      setStatusDateToToday(testRowIndex);

      // First select 1 month
      cy.selectAgGridDropdown(testRowIndex, 'tracking2', '1 month');
      cy.wait(1500);

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((firstInterval) => {
          const firstDays = parseInt(firstInterval.trim(), 10);
          expect(firstDays).to.be.within(28, 31);

          // Now change to 6 months
          cy.selectAgGridDropdown(testRowIndex, 'tracking2', '6 months');
          cy.wait(1500);

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
});
