/**
 * Cascading Dropdown Tests - Cypress
 *
 * Tests the cascading dropdown behavior:
 * - Request Type → Quality Measure → Measure Status → Tracking
 * - Value selection and auto-fill
 * - Cascading field clearing
 */

describe('Cascading Dropdowns', () => {
  // Use the first row (index 0) which is always visible - no virtual scrolling issues
  const testRowIndex = 0;

  beforeEach(() => {
    cy.visit('/');
    cy.waitForAgGrid();
  });

  describe('Request Type Selection', () => {
    it('Request Type dropdown has 4 options', () => {
      cy.openAgGridDropdown(testRowIndex, 'requestType');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('AWV');
        expect(options).to.include('Chronic DX');
        expect(options).to.include('Quality');
        expect(options).to.include('Screening');

        const nonEmpty = options.filter(opt => opt.trim() !== '');
        expect(nonEmpty.length).to.equal(4);
      });
    });

    it('AWV auto-fills Quality Measure with Annual Wellness Visit', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.wait(300);

      cy.getAgGridCell(testRowIndex, 'qualityMeasure')
        .should('contain.text', 'Annual Wellness Visit');
    });

    it('Chronic DX auto-fills Quality Measure with Chronic Diagnosis Code', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Chronic DX');
      cy.wait(300);

      cy.getAgGridCell(testRowIndex, 'qualityMeasure')
        .should('contain.text', 'Chronic Diagnosis Code');
    });

    it('Quality shows 8 Quality Measure options', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.wait(500);

      // Open qualityMeasure dropdown directly (no header click needed)
      cy.openAgGridDropdown(testRowIndex, 'qualityMeasure');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Diabetic Eye Exam');
        expect(options).to.include('GC/Chlamydia Screening');
        expect(options).to.include('Diabetic Nephropathy');
        expect(options).to.include('Hypertension Management');
        expect(options).to.include('ACE/ARB in DM or CAD');
        expect(options).to.include('Vaccination');
        expect(options).to.include('Diabetes Control');
        expect(options).to.include('Annual Serum K&Cr');

        const nonEmpty = options.filter(opt => opt.trim() !== '');
        expect(nonEmpty.length).to.equal(8);
      });
    });

    it('Screening shows 3 Quality Measure options', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
      cy.wait(500);

      // Open qualityMeasure dropdown directly (no header click needed)
      cy.openAgGridDropdown(testRowIndex, 'qualityMeasure');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Breast Cancer Screening');
        expect(options).to.include('Colon Cancer Screening');
        expect(options).to.include('Cervical Cancer Screening');

        const nonEmpty = options.filter(opt => opt.trim() !== '');
        expect(nonEmpty.length).to.equal(3);
      });
    });
  });

  describe('AWV Measure Status', () => {
    beforeEach(() => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.wait(300);
    });

    it('AWV has 7 status options', () => {
      cy.openAgGridDropdown(testRowIndex, 'measureStatus');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Not Addressed');
        expect(options).to.include('Patient called to schedule AWV');
        expect(options).to.include('AWV scheduled');
        expect(options).to.include('AWV completed');
        expect(options).to.include('Patient declined AWV');
        expect(options).to.include('Will call later to schedule');
        expect(options).to.include('No longer applicable');

        const nonEmpty = options.filter(opt => opt.trim() !== '');
        expect(nonEmpty.length).to.equal(7);
      });
    });

    it('can select AWV completed status', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'AWV completed');
      cy.wait(300);

      cy.getAgGridCell(testRowIndex, 'measureStatus')
        .should('contain.text', 'AWV completed');
    });

    it('AWV completed shows green row color', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'AWV completed');
      cy.wait(500);

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });

    it('AWV scheduled shows blue row color', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'AWV scheduled');
      cy.wait(500);

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-blue');
    });

    it('Patient declined AWV shows purple row color', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Patient declined AWV');
      cy.wait(500);

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-purple');
    });
  });

  describe('Breast Cancer Screening', () => {
    beforeEach(() => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Breast Cancer Screening');
      cy.wait(300);
    });

    it('Breast Cancer Screening has 8 status options', () => {
      cy.openAgGridDropdown(testRowIndex, 'measureStatus');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Not Addressed');
        expect(options).to.include('Screening discussed');
        expect(options).to.include('Screening test ordered');
        expect(options).to.include('Screening test completed');
        expect(options).to.include('Obtaining outside records');
        expect(options).to.include('Patient declined screening');
        expect(options).to.include('No longer applicable');
        expect(options).to.include('Screening unnecessary');

        const nonEmpty = options.filter(opt => opt.trim() !== '');
        expect(nonEmpty.length).to.equal(8);
      });
    });

    it('Screening test ordered shows Tracking #1 options', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Screening test ordered');
      cy.wait(300);

      cy.openAgGridDropdown(testRowIndex, 'tracking1');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Mammogram');
        expect(options).to.include('Breast Ultrasound');
        expect(options).to.include('Breast MRI');

        const nonEmpty = options.filter(opt => opt.trim() !== '');
        expect(nonEmpty.length).to.equal(3);
      });
    });

    it('can select Mammogram tracking', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Screening test ordered');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'tracking1', 'Mammogram');
      cy.wait(300);

      cy.getAgGridCell(testRowIndex, 'tracking1')
        .should('contain.text', 'Mammogram');
    });

    it('Screening test completed shows green row', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Screening test completed');
      cy.wait(500);

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });
  });

  describe('Chronic Diagnosis Code', () => {
    beforeEach(() => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Chronic DX');
      cy.wait(300);
    });

    it('Chronic Diagnosis Code has 5 status options', () => {
      cy.openAgGridDropdown(testRowIndex, 'measureStatus');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Not Addressed');
        expect(options).to.include('Chronic diagnosis confirmed');
        expect(options).to.include('Chronic diagnosis resolved');
        expect(options).to.include('Chronic diagnosis invalid');
        expect(options).to.include('No longer applicable');

        const nonEmpty = options.filter(opt => opt.trim() !== '');
        expect(nonEmpty.length).to.equal(5);
      });
    });

    it('Chronic diagnosis resolved shows attestation options', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis resolved');
      cy.wait(300);

      cy.openAgGridDropdown(testRowIndex, 'tracking1');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Attestation not sent');
        expect(options).to.include('Attestation sent');

        const nonEmpty = options.filter(opt => opt.trim() !== '');
        expect(nonEmpty.length).to.equal(2);
      });
    });

    it('Chronic diagnosis resolved shows orange row', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis resolved');
      cy.wait(500);

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-orange');
    });
  });

  describe('Hypertension Management - BP Status Change', () => {
    beforeEach(() => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Hypertension Management');
      cy.wait(300);
    });

    it('changing from BP call back status to BP at goal clears dueDate and interval', () => {
      // Set up: Select "Scheduled call back - BP not at goal" (has baseDueDays: 7)
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Scheduled call back - BP not at goal');
      cy.wait(300);

      // Set status date to trigger due date calculation (uses baseDueDays: 7)
      // Format: MM/DD/YYYY as expected by the cell
      const today = new Date();
      const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
      cy.getAgGridCell(testRowIndex, 'statusDate').dblclick();
      cy.get('.ag-cell-edit-wrapper input').clear().type(formattedDate);
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');
      cy.wait(1000);

      // Verify due date is set (timeIntervalDays column should have value 7)
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(7);
        });

      // Now change to "Blood pressure at goal"
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Blood pressure at goal');
      cy.wait(1000);

      // Due date and time interval should be cleared
      cy.getAgGridCellWithScroll(testRowIndex, 'dueDate')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');

      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');

      // Row should be green (not red/overdue)
      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });

    it('BP at goal shows green row color', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Blood pressure at goal');
      cy.wait(500);

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });
  });

  describe('HgbA1c Due Date Calculation', () => {
    beforeEach(() => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      cy.wait(300);
    });

    it('HgbA1c ordered has no due date without Tracking #2 selection', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.wait(500);

      // Due date should be empty (no base fallback)
      cy.getAgGridCellWithScroll(testRowIndex, 'dueDate')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');

      // Time interval should be empty
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');
    });

    it('HgbA1c ordered Tracking #2 has 12 month options', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.wait(300);

      cy.openAgGridDropdown(testRowIndex, 'tracking2');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('1 month');
        expect(options).to.include('3 months');
        expect(options).to.include('6 months');
        expect(options).to.include('12 months');

        const nonEmpty = options.filter(opt => opt.trim() !== '');
        expect(nonEmpty.length).to.equal(12);
      });
    });

    it('selecting Tracking #2 calculates due date for HgbA1c ordered', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.wait(300);

      // Set status date first (required for due date calculation)
      // Format: MM/DD/YYYY as expected by the cell
      const today = new Date();
      const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
      cy.getAgGridCell(testRowIndex, 'statusDate').dblclick();
      cy.get('.ag-cell-edit-wrapper input').clear().type(formattedDate);
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');
      cy.wait(1000);

      // Select 1 month interval
      cy.selectAgGridDropdown(testRowIndex, 'tracking2', '1 month');
      cy.wait(1500);

      // Time interval should now show ~30 days
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          // Allow for month variation (28-31 days)
          expect(days).to.be.within(28, 31);
        });

      // Due date should be set
      cy.getAgGridCellWithScroll(testRowIndex, 'dueDate')
        .invoke('text')
        .should('not.be.empty');
    });

    it('HgbA1c at goal requires Tracking #2 for due date', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c at goal');
      cy.wait(300);

      // Set status date first (required for due date calculation)
      // Format: MM/DD/YYYY as expected by the cell
      const today = new Date();
      const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
      cy.getAgGridCell(testRowIndex, 'statusDate').dblclick();
      cy.get('.ag-cell-edit-wrapper input').clear().type(formattedDate);
      cy.get('.ag-cell-edit-wrapper input').type('{enter}');
      cy.wait(1000);

      // Due date should be empty without tracking2 (even with status date)
      cy.getAgGridCellWithScroll(testRowIndex, 'dueDate')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');

      // Select 3 months
      cy.selectAgGridDropdown(testRowIndex, 'tracking2', '3 months');
      cy.wait(1500);

      // Time interval should now show ~90 days
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          // Allow for month variation
          expect(days).to.be.within(84, 93);
        });
    });
  });

  describe('Cascading Field Clearing', () => {
    it('changing Request Type clears Quality Measure and downstream', () => {
      // Set up a complete row
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetic Eye Exam');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Diabetic eye exam completed');
      cy.wait(300);

      // Verify values are set
      cy.getAgGridCell(testRowIndex, 'qualityMeasure')
        .should('contain.text', 'Diabetic Eye Exam');
      cy.getAgGridCell(testRowIndex, 'measureStatus')
        .should('contain.text', 'Diabetic eye exam completed');

      // Change Request Type
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
      cy.wait(500);

      // Quality Measure should be cleared
      cy.getAgGridCell(testRowIndex, 'qualityMeasure')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');

      // Measure Status should be cleared
      cy.getAgGridCell(testRowIndex, 'measureStatus')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');
    });

    it('changing Quality Measure clears Measure Status', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetic Eye Exam');
      cy.wait(300);
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Diabetic eye exam completed');
      cy.wait(300);

      // Verify status is set
      cy.getAgGridCell(testRowIndex, 'measureStatus')
        .should('contain.text', 'Diabetic eye exam completed');

      // Change Quality Measure
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Vaccination');
      cy.wait(500);

      // Measure Status should be cleared
      cy.getAgGridCell(testRowIndex, 'measureStatus')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');
    });
  });
});
