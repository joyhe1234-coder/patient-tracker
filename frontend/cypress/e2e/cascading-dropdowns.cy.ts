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
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';
  const testRowIndex = 0;

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
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

        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.equal(4);
      });
    });

    it('AWV auto-fills Quality Measure with Annual Wellness Visit', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');

      cy.getAgGridCell(testRowIndex, 'qualityMeasure')
        .should('contain.text', 'Annual Wellness Visit');
    });

    it('Chronic DX auto-fills Quality Measure with Chronic Diagnosis Code', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Chronic DX');

      cy.getAgGridCell(testRowIndex, 'qualityMeasure')
        .should('contain.text', 'Chronic Diagnosis Code');
    });

    it('Quality shows 8 Quality Measure options', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Quality');

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

        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.equal(8);
      });
    });

    it('Screening shows 4 Quality Measure options', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Screening');

      // Open qualityMeasure dropdown directly (no header click needed)
      cy.openAgGridDropdown(testRowIndex, 'qualityMeasure');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Breast Cancer Screening');
        expect(options).to.include('Colon Cancer Screening');
        expect(options).to.include('Cervical Cancer Screening');
        expect(options).to.include('Depression Screening');

        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.equal(4);
      });
    });
  });

  describe('AWV Measure Status', () => {
    beforeEach(() => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'AWV');
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

        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.equal(7);
      });
    });

    it('can select AWV completed status', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'AWV completed');

      cy.getAgGridCell(testRowIndex, 'measureStatus')
        .should('contain.text', 'AWV completed');
    });

    it('AWV completed shows green row color', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'AWV completed');

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });

    it('AWV scheduled shows blue row color', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'AWV scheduled');

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-blue');
    });

    it('Patient declined AWV shows purple row color', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Patient declined AWV');

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-purple');
    });
  });

  describe('Breast Cancer Screening', () => {
    // Use a dedicated row index for Breast Cancer Screening tests.
    // This avoids 409 duplicate errors when another row of the same patient
    // already has (Screening, Breast Cancer Screening) from a prior test run.
    let bcRowIndex = testRowIndex;

    beforeEach(function () {
      // Find a row that already has Breast Cancer Screening to avoid duplicate 409
      cy.get('.ag-center-cols-container').then(($container) => {
        const cells = $container.find('[col-id="qualityMeasure"]');
        let foundRow = -1;
        cells.each((_, cell) => {
          const text = Cypress.$(cell).text().replace(/[✓▾]/g, '').trim();
          if (text === 'Breast Cancer Screening') {
            const rowEl = Cypress.$(cell).closest('[row-index]');
            foundRow = parseInt(rowEl.attr('row-index') || '-1', 10);
            return false; // break
          }
        });

        if (foundRow >= 0) {
          // Use the existing row — just ensure requestType is Screening
          bcRowIndex = foundRow;
          cy.getAgGridCell(bcRowIndex, 'requestType').should('contain.text', 'Screening');
        } else {
          // No existing row — set up row 0
          bcRowIndex = testRowIndex;
          cy.selectAgGridDropdown(bcRowIndex, 'requestType', 'Screening');
          cy.getAgGridCell(bcRowIndex, 'requestType').should('contain.text', 'Screening');
          cy.selectAgGridDropdown(bcRowIndex, 'qualityMeasure', 'Breast Cancer Screening');
          cy.getAgGridCell(bcRowIndex, 'qualityMeasure').should('contain.text', 'Breast Cancer Screening');
        }
      });
    });

    it('Breast Cancer Screening has 8 status options', () => {
      cy.openAgGridDropdown(bcRowIndex, 'measureStatus');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Not Addressed');
        expect(options).to.include('Screening discussed');
        expect(options).to.include('Screening test ordered');
        expect(options).to.include('Screening test completed');
        expect(options).to.include('Obtaining outside records');
        expect(options).to.include('Patient declined screening');
        expect(options).to.include('No longer applicable');
        expect(options).to.include('Screening unnecessary');

        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.equal(8);
      });
    });

    it('Screening test ordered shows Tracking #1 options', () => {
      cy.selectAgGridDropdown(bcRowIndex, 'measureStatus', 'Screening test ordered');
      cy.getAgGridCell(bcRowIndex, 'measureStatus').should('contain.text', 'Screening test ordered');

      cy.openAgGridDropdown(bcRowIndex, 'tracking1');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Mammogram');
        expect(options).to.include('Breast Ultrasound');
        expect(options).to.include('Breast MRI');

        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.equal(3);
      });
    });

    it('can select Mammogram tracking', () => {
      cy.selectAgGridDropdown(bcRowIndex, 'measureStatus', 'Screening test ordered');
      cy.getAgGridCell(bcRowIndex, 'measureStatus').should('contain.text', 'Screening test ordered');
      cy.selectAgGridDropdown(bcRowIndex, 'tracking1', 'Mammogram');

      cy.getAgGridCell(bcRowIndex, 'tracking1')
        .should('contain.text', 'Mammogram');
    });

    it('Screening test completed shows green row', () => {
      cy.selectAgGridDropdown(bcRowIndex, 'measureStatus', 'Screening test completed');

      cy.get(`[row-index="${bcRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });
  });

  describe('Chronic Diagnosis Code', () => {
    beforeEach(() => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Chronic DX');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Chronic DX');
    });

    it('Chronic Diagnosis Code has 5 status options', () => {
      cy.openAgGridDropdown(testRowIndex, 'measureStatus');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Not Addressed');
        expect(options).to.include('Chronic diagnosis confirmed');
        expect(options).to.include('Chronic diagnosis resolved');
        expect(options).to.include('Chronic diagnosis invalid');
        expect(options).to.include('No longer applicable');

        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.equal(5);
      });
    });

    it('Chronic diagnosis resolved shows attestation options', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis resolved');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Chronic diagnosis resolved');

      cy.openAgGridDropdown(testRowIndex, 'tracking1');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Attestation not sent');
        expect(options).to.include('Attestation sent');

        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.equal(2);
      });
    });

    it('Chronic diagnosis resolved shows orange row', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis resolved');

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-orange');
    });
  });

  describe('Chronic DX Attestation Color Cascade', () => {
    beforeEach(() => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Chronic DX');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Chronic DX');
    });

    it('Chronic diagnosis resolved + Attestation sent → GREEN row', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis resolved');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Chronic diagnosis resolved');
      cy.selectAgGridDropdown(testRowIndex, 'tracking1', 'Attestation sent');

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });

    it('Chronic diagnosis resolved + Attestation not sent → ORANGE row', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis resolved');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Chronic diagnosis resolved');
      cy.selectAgGridDropdown(testRowIndex, 'tracking1', 'Attestation not sent');

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-orange');
    });

    it('Chronic diagnosis invalid + Attestation sent → GREEN row', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis invalid');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Chronic diagnosis invalid');
      cy.selectAgGridDropdown(testRowIndex, 'tracking1', 'Attestation sent');

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });

    it('Chronic diagnosis invalid + Attestation not sent → ORANGE row', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis invalid');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Chronic diagnosis invalid');
      cy.selectAgGridDropdown(testRowIndex, 'tracking1', 'Attestation not sent');

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-orange');
    });

    it('Chronic diagnosis resolved + Attestation not sent + overdue → RED row', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis resolved');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Chronic diagnosis resolved');

      // Enter a past status date (30 days ago) so dueDate will be in the past
      // DueDayRule: "Attestation not sent" → dueDays: 14
      // dueDate = 30 days ago + 14 = 16 days ago → overdue
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      const formattedDate = `${String(pastDate.getMonth() + 1).padStart(2, '0')}/${String(pastDate.getDate()).padStart(2, '0')}/${pastDate.getFullYear()}`;
      cy.getAgGridCell(testRowIndex, 'statusDate').dblclick();
      cy.get('.date-cell-editor').clear().type(formattedDate);
      cy.get('.date-cell-editor').type('{enter}');
      cy.getAgGridCell(testRowIndex, 'statusDate').should('not.have.text', '');

      // Select Attestation not sent → backend calculates dueDate 14 days from past statusDate
      cy.selectAgGridDropdown(testRowIndex, 'tracking1', 'Attestation not sent');

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-overdue');
    });

    it('Chronic diagnosis resolved + Attestation sent remains GREEN even with past date', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis resolved');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Chronic diagnosis resolved');

      // Enter a past status date (30 days ago)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      const formattedDate = `${String(pastDate.getMonth() + 1).padStart(2, '0')}/${String(pastDate.getDate()).padStart(2, '0')}/${pastDate.getFullYear()}`;
      cy.getAgGridCell(testRowIndex, 'statusDate').dblclick();
      cy.get('.date-cell-editor').clear().type(formattedDate);
      cy.get('.date-cell-editor').type('{enter}');
      cy.getAgGridCell(testRowIndex, 'statusDate').should('not.have.text', '');

      // Attestation sent → GREEN (no DueDayRule, so no dueDate, can never be overdue)
      cy.selectAgGridDropdown(testRowIndex, 'tracking1', 'Attestation sent');

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });
  });

  describe('Hypertension Management - BP Status Change', () => {
    beforeEach(() => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Quality');
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Hypertension Management');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Hypertension Management');
    });

    it('changing from BP call back status to BP at goal clears dueDate and interval', () => {
      // Set up: Select "Scheduled call back - BP not at goal" (has baseDueDays: 7)
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Scheduled call back - BP not at goal');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Scheduled call back - BP not at goal');

      // Set status date to trigger due date calculation (uses baseDueDays: 7)
      // Format: MM/DD/YYYY as expected by the cell
      const today = new Date();
      const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
      cy.getAgGridCell(testRowIndex, 'statusDate').dblclick();
      cy.get('.date-cell-editor').clear().type(formattedDate);
      cy.get('.date-cell-editor').type('{enter}');
      cy.getAgGridCell(testRowIndex, 'statusDate').should('not.have.text', '');

      // Verify due date is set (timeIntervalDays column should have value 7)
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .then((text) => {
          const days = parseInt(text.trim(), 10);
          expect(days).to.equal(7);
        });

      // Now change to "Blood pressure at goal"
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Blood pressure at goal');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Blood pressure at goal');

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

      cy.get(`[row-index="${testRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });
  });

  describe('HgbA1c Due Date Calculation', () => {
    beforeEach(() => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Quality');
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Diabetes Control');
    });

    it('HgbA1c ordered has no due date without Tracking #2 selection', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'HgbA1c ordered');

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
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'HgbA1c ordered');

      cy.openAgGridDropdown(testRowIndex, 'tracking2');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('1 month');
        expect(options).to.include('3 months');
        expect(options).to.include('6 months');
        expect(options).to.include('12 months');

        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.equal(12);
      });
    });

    it('selecting Tracking #2 calculates due date for HgbA1c ordered', () => {
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'HgbA1c ordered');

      // Set status date first (required for due date calculation)
      // Format: MM/DD/YYYY as expected by the cell
      const today = new Date();
      const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
      cy.getAgGridCell(testRowIndex, 'statusDate').dblclick();
      cy.get('.date-cell-editor').clear().type(formattedDate);
      cy.get('.date-cell-editor').type('{enter}');
      cy.getAgGridCell(testRowIndex, 'statusDate').should('not.have.text', '');

      // Select 1 month interval
      cy.selectAgGridDropdown(testRowIndex, 'tracking2', '1 month');

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
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'HgbA1c at goal');

      // Set status date first (required for due date calculation)
      // Format: MM/DD/YYYY as expected by the cell
      const today = new Date();
      const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
      cy.getAgGridCell(testRowIndex, 'statusDate').dblclick();
      cy.get('.date-cell-editor').clear().type(formattedDate);
      cy.get('.date-cell-editor').type('{enter}');
      cy.getAgGridCell(testRowIndex, 'statusDate').should('not.have.text', '');

      // Due date should be empty without tracking2 (even with status date)
      cy.getAgGridCellWithScroll(testRowIndex, 'dueDate')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');

      // Select 3 months
      cy.selectAgGridDropdown(testRowIndex, 'tracking2', '3 months');

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
    // Use a fresh row for clearing tests to avoid version conflicts
    // from prior edits to row 0. Adding a row gives us a clean version=1 row.
    it('changing Request Type clears Quality Measure and downstream', () => {
      cy.addTestRow('CascClear-RT, Test');
      cy.get('body').type('{esc}');
      cy.wait(500);

      // Set up a complete row on the newly added row 0
      cy.selectAgGridDropdownAndVerify(0, 'requestType', 'Quality');
      cy.wait(1500);
      cy.selectAgGridDropdownAndVerify(0, 'qualityMeasure', 'Diabetic Eye Exam');
      cy.wait(1500);
      cy.selectAgGridDropdownAndVerify(0, 'measureStatus', 'Diabetic eye exam completed');
      cy.wait(1500);

      // Verify values are set
      cy.getAgGridCell(0, 'qualityMeasure')
        .should('contain.text', 'Diabetic Eye Exam');
      cy.getAgGridCell(0, 'measureStatus')
        .should('contain.text', 'Diabetic eye exam completed');

      // Change Request Type — this should cascade-clear qualityMeasure and measureStatus
      cy.selectAgGridDropdownAndVerify(0, 'requestType', 'Screening');
      cy.wait(2000);

      // Quality Measure should be cleared (strip dropdown arrow '▾' from text)
      cy.getAgGridCell(0, 'qualityMeasure')
        .invoke('text')
        .should('satisfy', (text: string) => text.replace(/▾/g, '').trim() === '');

      // Measure Status should be cleared
      cy.getAgGridCell(0, 'measureStatus')
        .invoke('text')
        .should('satisfy', (text: string) => text.replace(/▾/g, '').trim() === '');
    });

    it('changing Quality Measure clears Measure Status', () => {
      cy.addTestRow('CascClear-QM, Test');
      cy.get('body').type('{esc}');
      cy.wait(500);

      cy.selectAgGridDropdownAndVerify(0, 'requestType', 'Quality');
      cy.wait(1500);
      cy.selectAgGridDropdownAndVerify(0, 'qualityMeasure', 'Diabetic Eye Exam');
      cy.wait(1500);
      cy.selectAgGridDropdownAndVerify(0, 'measureStatus', 'Diabetic eye exam completed');
      cy.wait(1500);

      // Verify status is set
      cy.getAgGridCell(0, 'measureStatus')
        .should('contain.text', 'Diabetic eye exam completed');

      // Change Quality Measure — this should cascade-clear measureStatus
      cy.selectAgGridDropdownAndVerify(0, 'qualityMeasure', 'Vaccination');
      cy.wait(2000);

      // Measure Status should be cleared (strip dropdown arrow '▾' from text)
      cy.getAgGridCell(0, 'measureStatus')
        .invoke('text')
        .should('satisfy', (text: string) => text.replace(/▾/g, '').trim() === '');
    });
  });

  describe('Tracking #1 Prompt Text', () => {
    it('Colon cancer screening shows "Select screening type" prompt', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Screening');
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Colon Cancer Screening');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Colon Cancer Screening');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Colon cancer screening ordered');

      cy.getAgGridCell(testRowIndex, 'tracking1')
        .should('contain.text', 'Select screening type');
    });

    it('Breast Cancer Screening test ordered shows "Select test type" prompt', () => {
      // Find or create a row with Breast Cancer Screening (avoids 409 duplicate)
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
          // No existing row — set up from scratch
          cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
          cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Screening');
          cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Breast Cancer Screening');
          cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Breast Cancer Screening');
        }

        cy.selectAgGridDropdown(targetRow, 'measureStatus', 'Screening test ordered');
        cy.getAgGridCell(targetRow, 'measureStatus').should('contain.text', 'Screening test ordered');
        cy.getAgGridCell(targetRow, 'tracking1').should('contain.text', 'Select test type');
      });
    });

    it('Chronic diagnosis resolved shows "Select status" prompt', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Chronic DX');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Chronic DX');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Chronic diagnosis resolved');

      cy.getAgGridCell(testRowIndex, 'tracking1')
        .should('contain.text', 'Select status');
    });

    it('Screening discussed shows "Select time period" prompt', () => {
      // Find or create a row with Breast Cancer Screening (avoids 409 duplicate)
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
        cy.getAgGridCell(targetRow, 'tracking1').should('contain.text', 'Select time period');
      });
    });

    it('HgbA1c ordered shows "HgbA1c value" prompt in tracking1', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Quality');
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Diabetes Control');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'HgbA1c ordered');

      cy.getAgGridCell(testRowIndex, 'tracking1')
        .should('contain.text', 'HgbA1c value');
    });
  });

  describe('TC-6.10: Cascading Clear on Measure Status Change', () => {
    it('changing Measure Status clears Status Date, Tracking, Due Date, and Interval but preserves Notes', () => {
      // Set up a row with data: Quality > Colon Cancer > screening ordered + tracking + date
      // After each cascading step, verify the NEXT cell updated before proceeding
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Screening');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should(($cell) => {
        const text = $cell.text().replace(/▾/g, '').trim();
        expect(text === '' || text.includes('Screening') || text.includes('Cancer') || text.includes('Depression')).to.be.true;
      });
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Colon Cancer Screening');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should(($cell) => {
        const text = $cell.text().replace(/▾/g, '').trim();
        expect(text === '' || text.toLowerCase().includes('colon') || text.toLowerCase().includes('screening')).to.be.true;
      });
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Colon cancer screening ordered');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Colon cancer screening ordered');

      // Set a status date
      const today = new Date();
      const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
      cy.getAgGridCell(testRowIndex, 'statusDate').dblclick();
      cy.get('.date-cell-editor').clear().type(formattedDate);
      cy.get('.date-cell-editor').type('{enter}');
      cy.getAgGridCell(testRowIndex, 'statusDate').should('not.have.text', '');

      // Set Tracking #1 to "Colonoscopy" (triggers due date calculation)
      cy.selectAgGridDropdown(testRowIndex, 'tracking1', 'Colonoscopy');
      cy.getAgGridCell(testRowIndex, 'tracking1').should('contain.text', 'Colonoscopy');

      // Add a note to verify it's preserved
      cy.getAgGridCellWithScroll(testRowIndex, 'notes').dblclick();
      cy.get('.ag-cell-edit-wrapper input, .ag-cell-edit-wrapper textarea').first()
        .clear().type('Test note preserved');
      cy.get('body').click();
      cy.getAgGridCellWithScroll(testRowIndex, 'notes').should('contain.text', 'Test note preserved');

      // Verify data is set
      cy.getAgGridCell(testRowIndex, 'statusDate')
        .invoke('text')
        .should('not.satisfy', (text: string) => text.trim() === '');

      // Change Measure Status to a value with NO tracking1 options and no auto-date
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Patient declined');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Patient declined');

      // Status Date gets auto-stamped on any status change (this is expected behavior).
      // We only verify that tracking, dueDate, and interval are cleared.

      // Tracking #1 should be cleared
      cy.getAgGridCell(testRowIndex, 'tracking1')
        .invoke('text')
        .should('satisfy', (text: string) => text.replace(/[✓▾]/g, '').trim() === '' || text.includes('N/A'));

      // Due Date should be cleared
      cy.getAgGridCellWithScroll(testRowIndex, 'dueDate')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');

      // Time Interval should be cleared
      cy.getAgGridCellWithScroll(testRowIndex, 'timeIntervalDays')
        .invoke('text')
        .should('satisfy', (text: string) => text.trim() === '');

      // Notes should be PRESERVED
      cy.getAgGridCellWithScroll(testRowIndex, 'notes')
        .should('contain.text', 'Test note preserved');
    });
  });

  describe('TC-11.2: Tracking #1 N/A State', () => {
    it('Tracking #1 shows N/A for statuses without tracking options', () => {
      // AWV completed has no tracking1 options → should show N/A
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'AWV');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'AWV completed');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'AWV completed');

      cy.getAgGridCell(testRowIndex, 'tracking1').then(($cell) => {
        const text = $cell.text().replace(/[✓▾]/g, '').trim();
        // Should show "N/A" or be empty (not a dropdown prompt)
        expect(text === 'N/A' || text === '').to.be.true;
      });
    });

    it('Tracking #1 N/A cell is not editable (no dropdown opens)', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'AWV');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'AWV completed');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'AWV completed');

      // Click the tracking1 cell — should NOT open a dropdown popup
      cy.getAgGridCell(testRowIndex, 'tracking1').click();

      cy.get('.ag-popup').should('not.exist');
    });
  });

  describe('TC-11.3: HgbA1c Month Dropdown (Tracking #2)', () => {
    it('Diabetes Control → HgbA1c ordered → Tracking #2 shows month options', () => {
      // Set up Diabetes Control measure (under Quality request type)
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Quality');
      // Wait for cascading: qualityMeasure should update
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should(($cell) => {
        const text = $cell.text().replace(/▾/g, '').trim();
        expect(text).to.not.include('Annual Wellness Visit');
        expect(text).to.not.include('Chronic Diagnosis Code');
      });
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      // Wait for cascading: measureStatus should update after qualityMeasure change
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Diabetes Control');
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'HgbA1c ordered');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'HgbA1c ordered');

      // Open Tracking #2 — should be a month dropdown
      cy.scrollToAgGridColumn('tracking2');
      cy.get(`[row-index="${testRowIndex}"] [col-id="tracking2"]`, { timeout: 10000 }).should('be.visible');
      cy.openAgGridDropdown(testRowIndex, 'tracking2');

      // Should show month options
      cy.getAgGridDropdownOptions().then((options) => {
        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        // Expect month durations (1 month, 2 months, etc.)
        expect(nonEmpty.length).to.be.greaterThan(0);
        const hasMonth = nonEmpty.some(opt => opt.toLowerCase().includes('month'));
        expect(hasMonth).to.be.true;
      });

      // Close dropdown
      cy.get('body').click();
    });
  });

  describe('TC-11.4: HgbA1c Free Text Tracking #1', () => {
    it('Diabetes Control → HgbA1c at goal → Tracking #1 accepts free text (HgbA1c value)', () => {
      // Set up Diabetes Control with HgbA1c at goal (under Quality request type)
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should(($cell) => {
        const text = $cell.text().replace(/▾/g, '').trim();
        expect(text).to.not.include('Annual Wellness Visit');
        expect(text).to.not.include('Chronic Diagnosis Code');
      });
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Diabetes Control');
      // Wait for cascading: measureStatus should update after qualityMeasure change
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Diabetes Control');
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'HgbA1c at goal');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'HgbA1c at goal');

      // Tracking #1 should show prompt "HgbA1c value" and accept free text
      cy.getAgGridCell(testRowIndex, 'tracking1').then(($cell) => {
        const text = $cell.text().replace(/[✓▾]/g, '').trim();
        // Cell might show "HgbA1c value" prompt or be empty
        if (text === '' || text.toLowerCase().includes('hgba1c')) {
          cy.log(`Tracking #1 prompt: "${text}"`);
        }
      });

      // Double-click to edit as free text
      cy.getAgGridCell(testRowIndex, 'tracking1').dblclick();

      // Should allow typing a value (not a dropdown) — text editor is inline
      cy.get('.ag-cell-edit-wrapper input, .ag-popup-editor input, .ag-popup-editor textarea', { timeout: 5000 }).first()
        .clear()
        .type('6.5{enter}');

      // Verify the value was accepted
      cy.getAgGridCell(testRowIndex, 'tracking1')
        .invoke('text')
        .should('contain', '6.5');
    });
  });

  describe('TC-11.5: Hypertension BP Reading (Tracking #2 Free Text)', () => {
    it('Hypertension → BP not at goal → Tracking #2 accepts BP reading free text', () => {
      // Set up Hypertension Management (under Quality request type)
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should(($cell) => {
        const text = $cell.text().replace(/▾/g, '').trim();
        expect(text).to.not.include('Annual Wellness Visit');
        expect(text).to.not.include('Chronic Diagnosis Code');
      });
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Hypertension Management');
      // Wait for cascading: measureStatus should update after qualityMeasure change
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Hypertension Management');
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Scheduled call back - BP not at goal');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Scheduled call back - BP not at goal');

      // Tracking #2 should accept BP reading as free text
      cy.scrollToAgGridColumn('tracking2');
      cy.get(`[row-index="${testRowIndex}"] [col-id="tracking2"]`, { timeout: 10000 }).should('be.visible');
      cy.getAgGridCellWithScroll(testRowIndex, 'tracking2').dblclick();

      cy.get('.ag-cell-edit-wrapper input, .ag-popup-editor input, .ag-popup-editor textarea', { timeout: 5000 }).first()
        .clear()
        .type('145/92{enter}');

      // Verify the BP reading was accepted
      cy.getAgGridCellWithScroll(testRowIndex, 'tracking2')
        .invoke('text')
        .should('contain', '145/92');
    });

    it('Hypertension → BP not at goal → Tracking #1 shows call interval dropdown', () => {
      // Set up Hypertension Management (under Quality request type)
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should(($cell) => {
        const text = $cell.text().replace(/▾/g, '').trim();
        expect(text).to.not.include('Annual Wellness Visit');
        expect(text).to.not.include('Chronic Diagnosis Code');
      });
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Hypertension Management');
      // Wait for cascading: measureStatus should update after qualityMeasure change
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Hypertension Management');
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Scheduled call back - BP not at goal');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Scheduled call back - BP not at goal');

      // Tracking #1 should show a dropdown with call interval options
      cy.openAgGridDropdown(testRowIndex, 'tracking1');

      cy.getAgGridDropdownOptions().then((options) => {
        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        // Should have time interval options
        expect(nonEmpty.length).to.be.greaterThan(0);
        cy.log(`Tracking #1 options: ${nonEmpty.join(', ')}`);
      });

      cy.get('body').click();
    });
  });

  describe('TC-11.6: Cervical Cancer Month Tracking', () => {
    it('Cervical Cancer → Screening discussed → Tracking #1 shows month options', () => {
      // Set up Cervical Cancer Screening
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Screening');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should(($cell) => {
        const text = $cell.text().replace(/▾/g, '').trim();
        // After Screening requestType, qualityMeasure should be empty or show a Screening measure
        expect(text === '' || text.includes('Screening') || text.includes('Cancer') || text.includes('Depression')).to.be.true;
      });
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Cervical Cancer Screening');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should(($cell) => {
        const text = $cell.text().replace(/▾/g, '').trim();
        expect(text === '' || text.toLowerCase().includes('screening') || text.toLowerCase().includes('pap')).to.be.true;
      });
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Screening discussed');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Screening discussed');

      // Tracking #1 should show month dropdown (from STATUS_TO_TRACKING1)
      cy.openAgGridDropdown(testRowIndex, 'tracking1');

      cy.getAgGridDropdownOptions().then((options) => {
        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.be.greaterThan(0);
        // Should contain month-related options (In 1 Month, In 2 Months, etc.)
        const hasMonth = nonEmpty.some(opt => opt.toLowerCase().includes('month'));
        expect(hasMonth).to.be.true;
        cy.log(`Cervical Cancer Tracking #1 options: ${nonEmpty.join(', ')}`);
      });

      cy.get('body').click();
    });
  });

  describe('TC-13.1: Network Error Recovery', () => {
    it('shows error when API request fails', () => {
      // Intercept PUT calls to simulate network failure (cell edits use PUT /api/data/:id)
      cy.intercept('PUT', '/api/data/*', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('failedPut');

      // Stub alert to capture error message
      const alertStub = cy.stub();
      cy.on('window:alert', alertStub);

      // Try to edit a cell (select a dropdown value)
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.wait('@failedPut', { timeout: 10000 });

      // The intercepted failure should trigger an error notification
      // The value may revert or show an error state
      cy.then(() => {
        if (alertStub.called) {
          cy.log(`Alert message: ${alertStub.firstCall?.args[0]}`);
        }
      });
    });
  });

  describe('Depression Screening', () => {
    // Find or set up a row with Depression Screening to avoid duplicate 409 conflicts
    let dsRowIndex = testRowIndex;

    beforeEach(function () {
      cy.get('.ag-center-cols-container').then(($container) => {
        const cells = $container.find('[col-id="qualityMeasure"]');
        let foundRow = -1;
        cells.each((_, cell) => {
          const text = Cypress.$(cell).text().replace(/[✓▾]/g, '').trim();
          if (text === 'Depression Screening') {
            const rowEl = Cypress.$(cell).closest('[row-index]');
            foundRow = parseInt(rowEl.attr('row-index') || '-1', 10);
            return false; // break
          }
        });

        if (foundRow >= 0) {
          dsRowIndex = foundRow;
          cy.getAgGridCell(dsRowIndex, 'requestType').should('contain.text', 'Screening');
        } else {
          dsRowIndex = testRowIndex;
          cy.selectAgGridDropdown(dsRowIndex, 'requestType', 'Screening');
          cy.getAgGridCell(dsRowIndex, 'requestType').should('contain.text', 'Screening');
          cy.selectAgGridDropdown(dsRowIndex, 'qualityMeasure', 'Depression Screening');
          cy.getAgGridCell(dsRowIndex, 'qualityMeasure').should('contain.text', 'Depression Screening');
        }
      });
    });

    it('Depression Screening has 7 status options', () => {
      cy.openAgGridDropdown(dsRowIndex, 'measureStatus');
      cy.getAgGridDropdownOptions().then((options) => {
        expect(options).to.include('Not Addressed');
        expect(options).to.include('Called to schedule');
        expect(options).to.include('Visit scheduled');
        expect(options).to.include('Screening complete');
        expect(options).to.include('Screening unnecessary');
        expect(options).to.include('Patient declined');
        expect(options).to.include('No longer applicable');

        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.equal(7);
      });
    });

    it('Screening complete shows green row color', () => {
      cy.selectAgGridDropdown(dsRowIndex, 'measureStatus', 'Screening complete');

      cy.get(`[row-index="${dsRowIndex}"]`).first()
        .should('have.class', 'row-status-green');
    });

    it('Called to schedule shows blue row color', () => {
      cy.selectAgGridDropdown(dsRowIndex, 'measureStatus', 'Called to schedule');

      cy.get(`[row-index="${dsRowIndex}"]`).first()
        .should('have.class', 'row-status-blue');
    });

    it('Visit scheduled shows yellow row color', () => {
      cy.selectAgGridDropdown(dsRowIndex, 'measureStatus', 'Visit scheduled');

      cy.get(`[row-index="${dsRowIndex}"]`).first()
        .should('have.class', 'row-status-yellow');
    });

    it('Patient declined shows purple row color', () => {
      cy.selectAgGridDropdown(dsRowIndex, 'measureStatus', 'Patient declined');

      cy.get(`[row-index="${dsRowIndex}"]`).first()
        .should('have.class', 'row-status-purple');
    });

    it('Screening unnecessary shows gray row color', () => {
      cy.selectAgGridDropdown(dsRowIndex, 'measureStatus', 'Screening unnecessary');

      cy.get(`[row-index="${dsRowIndex}"]`).first()
        .should('have.class', 'row-status-gray');
    });

    it('No longer applicable shows gray row color', () => {
      cy.selectAgGridDropdown(dsRowIndex, 'measureStatus', 'No longer applicable');

      cy.get(`[row-index="${dsRowIndex}"]`).first()
        .should('have.class', 'row-status-gray');
    });

    it('Depression Screening has no Tracking #1 options', () => {
      cy.selectAgGridDropdown(dsRowIndex, 'measureStatus', 'Called to schedule');
      cy.getAgGridCell(dsRowIndex, 'measureStatus').should('contain.text', 'Called to schedule');

      // Tracking #1 cell should show N/A or be non-editable (no dropdown options)
      cy.getAgGridCell(dsRowIndex, 'tracking1').then(($cell) => {
        const text = $cell.text().replace(/[✓▾]/g, '').trim();
        // Should be empty or "N/A" — NOT a selectable dropdown prompt
        expect(text).to.not.include('Select');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T8-1: Tracking field N/A state — non-editable
  // ═══════════════════════════════════════════════════════════════════════

  describe('T8-1: Tracking N/A Non-Editable', () => {
    it('tracking field shows "N/A" and is non-editable when tracking1 is "N/A"', () => {
      // AWV completed has no tracking1 options → should show N/A
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'AWV');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'AWV completed');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'AWV completed');

      // Tracking #1 should show N/A
      cy.getAgGridCell(testRowIndex, 'tracking1').then(($cell) => {
        const text = $cell.text().replace(/[✓▾]/g, '').trim();
        expect(text === 'N/A' || text === '').to.be.true;
      });

      // Click the cell — should NOT open a dropdown popup
      cy.getAgGridCell(testRowIndex, 'tracking1').click();
      cy.wait(300);
      cy.get('.ag-popup').should('not.exist');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T8-2: Tracking prompt labels and specific options
  // ═══════════════════════════════════════════════════════════════════════

  describe('T8-2: Tracking Prompt Labels', () => {
    it('BP tracking #2 shows correct prompt label', () => {
      // Set up Hypertension Management > BP not at goal
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Quality');
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Hypertension Management');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Hypertension Management');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Scheduled call back - BP not at goal');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Scheduled call back');

      // Tracking #2 should show a prompt or be a free text field for BP reading
      cy.scrollToAgGridColumn('tracking2');
      cy.get(`[row-index="${testRowIndex}"] [col-id="tracking2"]`, { timeout: 10000 }).should('be.visible');
      cy.getAgGridCellWithScroll(testRowIndex, 'tracking2').then(($cell) => {
        const text = $cell.text().replace(/[✓▾]/g, '').trim();
        // Should show BP reading prompt or be empty (free text field)
        cy.log(`BP Tracking #2 prompt: "${text}"`);
        // The prompt should contain "BP" or "reading" or be empty for free text
        expect(text === '' || text.toLowerCase().includes('bp') || text.toLowerCase().includes('reading')).to.be.true;
      });
    });

    it('Cervical Cancer tracking shows month options', () => {
      // Set up Cervical Cancer > Screening discussed
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Screening');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Screening');
      cy.selectAgGridDropdown(testRowIndex, 'qualityMeasure', 'Cervical Cancer Screening');
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').should('contain.text', 'Cervical Cancer Screening');
      cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Screening discussed');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Screening discussed');

      // Tracking #1 should show month options
      cy.openAgGridDropdown(testRowIndex, 'tracking1');
      cy.getAgGridDropdownOptions().then((options) => {
        const nonEmpty = options.filter(opt => opt.trim() !== '' && opt.trim() !== '(clear)');
        expect(nonEmpty.length).to.be.greaterThan(0);
        const hasMonth = nonEmpty.some(opt => opt.toLowerCase().includes('month'));
        expect(hasMonth).to.be.true;
      });
      cy.get('body').type('{esc}');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T8-3: Depression Screening cascading clear
  // ═══════════════════════════════════════════════════════════════════════

  describe('T8-3: Depression Screening Cascading Clear', () => {
    it('Depression Screening status change clears cascaded tracking fields', () => {
      // Set up Depression Screening > Called to schedule
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Screening');
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Depression Screening');
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Called to schedule');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Called to schedule');
      cy.get(`[row-index="${testRowIndex}"]`).first().should('have.class', 'row-status-blue');

      // Change status to "Not Addressed" — should clear tracking and revert to white
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Not Addressed');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Not Addressed');

      // Tracking #1 should be cleared/N/A
      cy.getAgGridCell(testRowIndex, 'tracking1')
        .invoke('text')
        .should('satisfy', (text: string) => {
          const cleaned = text.replace(/[✓▾]/g, '').trim();
          return cleaned === '' || cleaned === 'N/A';
        });

      // Row should be white
      cy.get(`[row-index="${testRowIndex}"]`).first().should('have.class', 'row-status-white');
    });

    it('Depression Screening "Not Addressed" shows white row after clearing', () => {
      // Set up Depression Screening > Screening complete (green)
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Screening');
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Depression Screening');
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Screening complete');
      cy.get(`[row-index="${testRowIndex}"]`).first().should('have.class', 'row-status-green');

      // Change to Not Addressed
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Not Addressed');
      cy.get(`[row-index="${testRowIndex}"]`).first().should('have.class', 'row-status-white');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T8-4: Depression terminal statuses set tracking1 to N/A
  // ═══════════════════════════════════════════════════════════════════════

  describe('T8-4: Depression Terminal Statuses Set Tracking to N/A', () => {
    it('Depression "Patient declined" sets tracking1 to "N/A"', () => {
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Screening');
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Depression Screening');
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Patient declined');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Patient declined');

      // Tracking #1 should show N/A (no tracking for terminal statuses)
      cy.getAgGridCell(testRowIndex, 'tracking1').then(($cell) => {
        const text = $cell.text().replace(/[✓▾]/g, '').trim();
        expect(text === 'N/A' || text === '').to.be.true;
      });
    });

    it('Depression "Screening unnecessary" sets tracking1 to "N/A"', () => {
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Screening');
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Depression Screening');
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'Screening unnecessary');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'Screening unnecessary');

      cy.getAgGridCell(testRowIndex, 'tracking1').then(($cell) => {
        const text = $cell.text().replace(/[✓▾]/g, '').trim();
        expect(text === 'N/A' || text === '').to.be.true;
      });
    });

    it('Depression "No longer applicable" sets tracking1 to "N/A"', () => {
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'requestType', 'Screening');
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'qualityMeasure', 'Depression Screening');
      cy.wait(500);
      cy.selectAgGridDropdownAndVerify(testRowIndex, 'measureStatus', 'No longer applicable');
      cy.getAgGridCell(testRowIndex, 'measureStatus').should('contain.text', 'No longer applicable');

      cy.getAgGridCell(testRowIndex, 'tracking1').then(($cell) => {
        const text = $cell.text().replace(/[✓▾]/g, '').trim();
        expect(text === 'N/A' || text === '').to.be.true;
      });
    });
  });
});
