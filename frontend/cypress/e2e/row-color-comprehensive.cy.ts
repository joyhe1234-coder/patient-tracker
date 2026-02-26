/**
 * Row Color — Comprehensive E2E Tests
 *
 * Tests ALL quality measures, status colors, tracking #1/#2 types,
 * date entry, overdue detection, and time interval editing.
 *
 * Run: npx cypress run --spec "cypress/e2e/row-color-comprehensive.cy.ts" --headed
 *
 * Sections:
 *   1. ALL statuses → row colors (every QM x every status)
 *   2. Tracking #1 dropdown — all options per applicable status
 *   3. HgbA1c: tracking #1 text + tracking #2 dropdown
 *   4. BP: tracking #1 dropdown + tracking #2 text
 *   5. Date entry → overdue transitions (past vs today)
 *   6. Time interval editing
 *   7. Special cases (Chronic DX attestation green override, gray/purple never overdue)
 *   8. Color transitions (status change → color changes)
 */

describe('Row Color — Comprehensive', () => {
  const RUN_ID = Date.now().toString(36).slice(-5);
  let testCounter = 0;

  // Far-past date guaranteed to exceed any baseDueDays (> 400 days ago)
  const PAST_DATE = '1/1/2024';
  const today = new Date();
  const TODAY_DATE = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

  beforeEach(() => {
    cy.login('admin@gmail.com', 'welcome100');
    cy.visit('/');
    cy.waitForAgGrid();
  });

  // ── Helpers ──────────────────────────────────────────────────────────

  function addRow(prefix: string) {
    testCounter++;
    const name = `${RUN_ID}${testCounter}-${prefix}, E2E`;
    cy.addTestRow(name);
    cy.get('body').type('{esc}');
    cy.wait(500);
  }

  function setDropdown(colId: string, value: string) {
    cy.selectAgGridDropdownAndVerify(0, colId, value);
    cy.wait(500);
  }

  function setupRow(rt: string, qm: string | null, ms: string) {
    setDropdown('requestType', rt);
    if (qm) setDropdown('qualityMeasure', qm);
    setDropdown('measureStatus', ms);
  }

  function scrollRight() {
    cy.get('.ag-center-cols-viewport').then(($v) => {
      $v[0].scrollLeft = $v[0].scrollWidth;
      $v[0].dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    cy.wait(600);
  }

  function scrollLeft() {
    cy.get('.ag-center-cols-viewport').then(($v) => {
      $v[0].scrollLeft = 0;
      $v[0].dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    cy.wait(400);
  }

  /** Set tracking #1 via dropdown (scrolls right, selects, scrolls back) */
  function setTracking1Dropdown(value: string) {
    scrollRight();
    setDropdown('tracking1', value);
    scrollLeft();
  }

  /** Set tracking #1 via text entry (for HgbA1c — dblclick opens text popup) */
  function setTracking1Text(value: string) {
    scrollRight();
    cy.getAgGridCell(0, 'tracking1').dblclick({ force: true });
    cy.wait(300);
    cy.get('.ag-popup input', { timeout: 5000 }).should('be.visible');
    cy.get('.ag-popup input').clear().type(`${value}{enter}`);
    cy.wait(1000);
    scrollLeft();
  }

  /** Set tracking #2 via dropdown (for HgbA1c month intervals) */
  function setTracking2Dropdown(value: string) {
    scrollRight();
    setDropdown('tracking2', value);
    scrollLeft();
  }

  /** Set tracking #2 via text entry (for BP readings — dblclick opens text popup) */
  function setTracking2Text(value: string) {
    scrollRight();
    cy.getAgGridCell(0, 'tracking2').dblclick({ force: true });
    cy.wait(300);
    cy.get('.ag-popup input', { timeout: 5000 }).should('be.visible');
    cy.get('.ag-popup input').clear().type(`${value}{enter}`);
    cy.wait(1000);
    scrollLeft();
  }

  /** Enter status date via double-click on LEFT side (avoids Today button overlay) */
  function setStatusDate(dateStr: string) {
    cy.get('[row-index="0"] [col-id="statusDate"]').first()
      .dblclick('left', { force: true });
    cy.get('.date-cell-editor', { timeout: 5000 }).should('exist');
    cy.get('.date-cell-editor').clear().type(`${dateStr}{enter}`);
    cy.wait(2000);
  }

  /** Click "Today" button on an empty status date cell */
  function clickTodayButton() {
    cy.getAgGridCell(0, 'statusDate')
      .find('.status-date-today-btn', { timeout: 5000 })
      .should('be.visible')
      .click({ force: true });
    cy.wait(2000);
  }

  /** Set time interval days via double-click (scroll right to find column) */
  function setTimeInterval(value: string) {
    scrollRight();
    cy.get(`[row-index="0"] [col-id="timeIntervalDays"]`, { timeout: 5000 })
      .first()
      .dblclick({ force: true });
    cy.wait(300);
    cy.focused().clear().type(`${value}{enter}`);
    cy.wait(1500);
    scrollLeft();
  }

  function assertColor(cssClass: string) {
    cy.get('[row-index="0"]').first().should('have.class', cssClass);
  }

  function assertNotColor(cssClass: string) {
    cy.get('[row-index="0"]').first().should('not.have.class', cssClass);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 1: ALL STATUSES → COLORS (no date/tracking, just color check)
  // ═══════════════════════════════════════════════════════════════════════

  describe('1A: Annual Wellness Visit', () => {
    it('Not Addressed → white', () => {
      addRow('AWV-W');
      setupRow('AWV', null, 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Patient called to schedule AWV → yellow', () => {
      addRow('AWV-Y');
      setupRow('AWV', null, 'Patient called to schedule AWV');
      assertColor('row-status-yellow');
    });
    it('AWV scheduled → blue', () => {
      addRow('AWV-B');
      setupRow('AWV', null, 'AWV scheduled');
      assertColor('row-status-blue');
    });
    it('AWV completed → green', () => {
      addRow('AWV-G');
      setupRow('AWV', null, 'AWV completed');
      assertColor('row-status-green');
    });
    it('Patient declined AWV → purple', () => {
      addRow('AWV-P');
      setupRow('AWV', null, 'Patient declined AWV');
      assertColor('row-status-purple');
    });
    it('Will call later to schedule → blue', () => {
      addRow('AWV-B2');
      setupRow('AWV', null, 'Will call later to schedule');
      assertColor('row-status-blue');
    });
    it('No longer applicable → gray', () => {
      addRow('AWV-Gr');
      setupRow('AWV', null, 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  describe('1B: Breast Cancer Screening', () => {
    it('Not Addressed → white', () => {
      addRow('BCS-W');
      setupRow('Screening', 'Breast Cancer Screening', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Screening discussed → yellow', () => {
      addRow('BCS-Y');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening discussed');
      assertColor('row-status-yellow');
    });
    it('Screening test ordered → blue', () => {
      addRow('BCS-B');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening test ordered');
      assertColor('row-status-blue');
    });
    it('Screening test completed → green', () => {
      addRow('BCS-G');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening test completed');
      assertColor('row-status-green');
    });
    it('Obtaining outside records → blue', () => {
      addRow('BCS-B2');
      setupRow('Screening', 'Breast Cancer Screening', 'Obtaining outside records');
      assertColor('row-status-blue');
    });
    it('Patient declined screening → purple', () => {
      addRow('BCS-P');
      setupRow('Screening', 'Breast Cancer Screening', 'Patient declined screening');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('BCS-Gr');
      setupRow('Screening', 'Breast Cancer Screening', 'No longer applicable');
      assertColor('row-status-gray');
    });
    it('Screening unnecessary → gray', () => {
      addRow('BCS-Gr2');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening unnecessary');
      assertColor('row-status-gray');
    });
  });

  describe('1C: Colon Cancer Screening', () => {
    it('Not Addressed → white', () => {
      addRow('CCS-W');
      setupRow('Screening', 'Colon Cancer Screening', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Screening discussed → yellow', () => {
      addRow('CCS-Y');
      setupRow('Screening', 'Colon Cancer Screening', 'Screening discussed');
      assertColor('row-status-yellow');
    });
    it('Colon cancer screening ordered → blue', () => {
      addRow('CCS-B');
      setupRow('Screening', 'Colon Cancer Screening', 'Colon cancer screening ordered');
      assertColor('row-status-blue');
    });
    it('Colon cancer screening completed → green', () => {
      addRow('CCS-G');
      setupRow('Screening', 'Colon Cancer Screening', 'Colon cancer screening completed');
      assertColor('row-status-green');
    });
    it('Obtaining outside records → blue', () => {
      addRow('CCS-B2');
      setupRow('Screening', 'Colon Cancer Screening', 'Obtaining outside records');
      assertColor('row-status-blue');
    });
    it('Patient declined screening → purple', () => {
      addRow('CCS-P');
      setupRow('Screening', 'Colon Cancer Screening', 'Patient declined screening');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('CCS-Gr');
      setupRow('Screening', 'Colon Cancer Screening', 'No longer applicable');
      assertColor('row-status-gray');
    });
    it('Screening unnecessary → gray', () => {
      addRow('CCS-Gr2');
      setupRow('Screening', 'Colon Cancer Screening', 'Screening unnecessary');
      assertColor('row-status-gray');
    });
  });

  describe('1D: Cervical Cancer Screening', () => {
    it('Not Addressed → white', () => {
      addRow('CvCS-W');
      setupRow('Screening', 'Cervical Cancer Screening', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Screening discussed → yellow', () => {
      addRow('CvCS-Y');
      setupRow('Screening', 'Cervical Cancer Screening', 'Screening discussed');
      assertColor('row-status-yellow');
    });
    it('Screening appt made → blue', () => {
      addRow('CvCS-B');
      setupRow('Screening', 'Cervical Cancer Screening', 'Screening appt made');
      assertColor('row-status-blue');
    });
    it('Screening completed → green', () => {
      addRow('CvCS-G');
      setupRow('Screening', 'Cervical Cancer Screening', 'Screening completed');
      assertColor('row-status-green');
    });
    it('Obtaining outside records → blue', () => {
      addRow('CvCS-B2');
      setupRow('Screening', 'Cervical Cancer Screening', 'Obtaining outside records');
      assertColor('row-status-blue');
    });
    it('Patient declined → purple', () => {
      addRow('CvCS-P');
      setupRow('Screening', 'Cervical Cancer Screening', 'Patient declined');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('CvCS-Gr');
      setupRow('Screening', 'Cervical Cancer Screening', 'No longer applicable');
      assertColor('row-status-gray');
    });
    it('Screening unnecessary → gray', () => {
      addRow('CvCS-Gr2');
      setupRow('Screening', 'Cervical Cancer Screening', 'Screening unnecessary');
      assertColor('row-status-gray');
    });
  });

  describe('1E: Depression Screening', () => {
    it('Not Addressed → white', () => {
      addRow('DS-W');
      setupRow('Screening', 'Depression Screening', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Called to schedule → blue', () => {
      addRow('DS-B');
      setupRow('Screening', 'Depression Screening', 'Called to schedule');
      assertColor('row-status-blue');
    });
    it('Visit scheduled → yellow', () => {
      addRow('DS-Y');
      setupRow('Screening', 'Depression Screening', 'Visit scheduled');
      assertColor('row-status-yellow');
    });
    it('Screening complete → green', () => {
      addRow('DS-G');
      setupRow('Screening', 'Depression Screening', 'Screening complete');
      assertColor('row-status-green');
    });
    it('Screening unnecessary → gray', () => {
      addRow('DS-Gr');
      setupRow('Screening', 'Depression Screening', 'Screening unnecessary');
      assertColor('row-status-gray');
    });
    it('Patient declined → purple', () => {
      addRow('DS-P');
      setupRow('Screening', 'Depression Screening', 'Patient declined');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('DS-Gr2');
      setupRow('Screening', 'Depression Screening', 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  describe('1F: Diabetic Eye Exam', () => {
    it('Not Addressed → white', () => {
      addRow('DEE-W');
      setupRow('Quality', 'Diabetic Eye Exam', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Diabetic eye exam discussed → yellow', () => {
      addRow('DEE-Y');
      setupRow('Quality', 'Diabetic Eye Exam', 'Diabetic eye exam discussed');
      assertColor('row-status-yellow');
    });
    it('Diabetic eye exam referral made → blue', () => {
      addRow('DEE-B');
      setupRow('Quality', 'Diabetic Eye Exam', 'Diabetic eye exam referral made');
      assertColor('row-status-blue');
    });
    it('Diabetic eye exam scheduled → blue', () => {
      addRow('DEE-B2');
      setupRow('Quality', 'Diabetic Eye Exam', 'Diabetic eye exam scheduled');
      assertColor('row-status-blue');
    });
    it('Diabetic eye exam completed → green', () => {
      addRow('DEE-G');
      setupRow('Quality', 'Diabetic Eye Exam', 'Diabetic eye exam completed');
      assertColor('row-status-green');
    });
    it('Obtaining outside records → blue', () => {
      addRow('DEE-B3');
      setupRow('Quality', 'Diabetic Eye Exam', 'Obtaining outside records');
      assertColor('row-status-blue');
    });
    it('Patient declined → purple', () => {
      addRow('DEE-P');
      setupRow('Quality', 'Diabetic Eye Exam', 'Patient declined');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('DEE-Gr');
      setupRow('Quality', 'Diabetic Eye Exam', 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  describe('1G: GC/Chlamydia Screening', () => {
    it('Not Addressed → white', () => {
      addRow('GC-W');
      setupRow('Quality', 'GC/Chlamydia Screening', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Patient contacted for screening → yellow', () => {
      addRow('GC-Y');
      setupRow('Quality', 'GC/Chlamydia Screening', 'Patient contacted for screening');
      assertColor('row-status-yellow');
    });
    it('Test ordered → blue', () => {
      addRow('GC-B');
      setupRow('Quality', 'GC/Chlamydia Screening', 'Test ordered');
      assertColor('row-status-blue');
    });
    it('GC/Clamydia screening completed → green', () => {
      addRow('GC-G');
      setupRow('Quality', 'GC/Chlamydia Screening', 'GC/Clamydia screening completed');
      assertColor('row-status-green');
    });
    it('Patient declined screening → purple', () => {
      addRow('GC-P');
      setupRow('Quality', 'GC/Chlamydia Screening', 'Patient declined screening');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('GC-Gr');
      setupRow('Quality', 'GC/Chlamydia Screening', 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  describe('1H: Diabetic Nephropathy', () => {
    it('Not Addressed → white', () => {
      addRow('DN-W');
      setupRow('Quality', 'Diabetic Nephropathy', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Patient contacted for screening → yellow', () => {
      addRow('DN-Y');
      setupRow('Quality', 'Diabetic Nephropathy', 'Patient contacted for screening');
      assertColor('row-status-yellow');
    });
    it('Urine microalbumin ordered → blue', () => {
      addRow('DN-B');
      setupRow('Quality', 'Diabetic Nephropathy', 'Urine microalbumin ordered');
      assertColor('row-status-blue');
    });
    it('Urine microalbumin completed → green', () => {
      addRow('DN-G');
      setupRow('Quality', 'Diabetic Nephropathy', 'Urine microalbumin completed');
      assertColor('row-status-green');
    });
    it('Patient declined screening → purple', () => {
      addRow('DN-P');
      setupRow('Quality', 'Diabetic Nephropathy', 'Patient declined screening');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('DN-Gr');
      setupRow('Quality', 'Diabetic Nephropathy', 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  describe('1I: Hypertension Management', () => {
    it('Not Addressed → white', () => {
      addRow('HTN-W');
      setupRow('Quality', 'Hypertension Management', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Blood pressure at goal → green', () => {
      addRow('HTN-G');
      setupRow('Quality', 'Hypertension Management', 'Blood pressure at goal');
      assertColor('row-status-green');
    });
    it('Scheduled call back - BP not at goal → blue', () => {
      addRow('HTN-B');
      setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP not at goal');
      assertColor('row-status-blue');
    });
    it('Scheduled call back - BP at goal → blue', () => {
      addRow('HTN-B2');
      setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP at goal');
      assertColor('row-status-blue');
    });
    it('Appointment scheduled → blue', () => {
      addRow('HTN-B3');
      setupRow('Quality', 'Hypertension Management', 'Appointment scheduled');
      assertColor('row-status-blue');
    });
    it('Declined BP control → purple', () => {
      addRow('HTN-P');
      setupRow('Quality', 'Hypertension Management', 'Declined BP control');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('HTN-Gr');
      setupRow('Quality', 'Hypertension Management', 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  describe('1J: ACE/ARB in DM or CAD', () => {
    it('Not Addressed → white', () => {
      addRow('ACE-W');
      setupRow('Quality', 'ACE/ARB in DM or CAD', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Patient on ACE/ARB → green', () => {
      addRow('ACE-G');
      setupRow('Quality', 'ACE/ARB in DM or CAD', 'Patient on ACE/ARB');
      assertColor('row-status-green');
    });
    it('ACE/ARB prescribed → blue', () => {
      addRow('ACE-B');
      setupRow('Quality', 'ACE/ARB in DM or CAD', 'ACE/ARB prescribed');
      assertColor('row-status-blue');
    });
    it('Patient declined → purple', () => {
      addRow('ACE-P');
      setupRow('Quality', 'ACE/ARB in DM or CAD', 'Patient declined');
      assertColor('row-status-purple');
    });
    it('Contraindicated → purple', () => {
      addRow('ACE-P2');
      setupRow('Quality', 'ACE/ARB in DM or CAD', 'Contraindicated');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('ACE-Gr');
      setupRow('Quality', 'ACE/ARB in DM or CAD', 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  describe('1K: Vaccination', () => {
    it('Not Addressed → white', () => {
      addRow('VAX-W');
      setupRow('Quality', 'Vaccination', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Vaccination discussed → yellow', () => {
      addRow('VAX-Y');
      setupRow('Quality', 'Vaccination', 'Vaccination discussed');
      assertColor('row-status-yellow');
    });
    it('Vaccination scheduled → blue', () => {
      addRow('VAX-B');
      setupRow('Quality', 'Vaccination', 'Vaccination scheduled');
      assertColor('row-status-blue');
    });
    it('Vaccination completed → green', () => {
      addRow('VAX-G');
      setupRow('Quality', 'Vaccination', 'Vaccination completed');
      assertColor('row-status-green');
    });
    it('Patient declined → purple', () => {
      addRow('VAX-P');
      setupRow('Quality', 'Vaccination', 'Patient declined');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('VAX-Gr');
      setupRow('Quality', 'Vaccination', 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  describe('1L: Diabetes Control', () => {
    it('Not Addressed → white', () => {
      addRow('DC-W');
      setupRow('Quality', 'Diabetes Control', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('HgbA1c ordered → blue', () => {
      addRow('DC-B');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c ordered');
      assertColor('row-status-blue');
    });
    it('HgbA1c at goal → green', () => {
      addRow('DC-G');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c at goal');
      assertColor('row-status-green');
    });
    it('HgbA1c NOT at goal → blue', () => {
      addRow('DC-B2');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c NOT at goal');
      assertColor('row-status-blue');
    });
    it('Patient declined → purple', () => {
      addRow('DC-P');
      setupRow('Quality', 'Diabetes Control', 'Patient declined');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('DC-Gr');
      setupRow('Quality', 'Diabetes Control', 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  describe('1M: Annual Serum K&Cr', () => {
    it('Not Addressed → white', () => {
      addRow('KCr-W');
      setupRow('Quality', 'Annual Serum K&Cr', 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Lab ordered → blue', () => {
      addRow('KCr-B');
      setupRow('Quality', 'Annual Serum K&Cr', 'Lab ordered');
      assertColor('row-status-blue');
    });
    it('Lab completed → green', () => {
      addRow('KCr-G');
      setupRow('Quality', 'Annual Serum K&Cr', 'Lab completed');
      assertColor('row-status-green');
    });
    it('Patient declined → purple', () => {
      addRow('KCr-P');
      setupRow('Quality', 'Annual Serum K&Cr', 'Patient declined');
      assertColor('row-status-purple');
    });
    it('No longer applicable → gray', () => {
      addRow('KCr-Gr');
      setupRow('Quality', 'Annual Serum K&Cr', 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  describe('1N: Chronic Diagnosis Code', () => {
    it('Not Addressed → white', () => {
      addRow('CDX-W');
      setupRow('Chronic DX', null, 'Not Addressed');
      assertColor('row-status-white');
    });
    it('Chronic diagnosis confirmed → green', () => {
      addRow('CDX-G');
      setupRow('Chronic DX', null, 'Chronic diagnosis confirmed');
      assertColor('row-status-green');
    });
    it('Chronic diagnosis resolved (no T1) → orange', () => {
      addRow('CDX-O');
      setupRow('Chronic DX', null, 'Chronic diagnosis resolved');
      assertColor('row-status-orange');
    });
    it('Chronic diagnosis invalid (no T1) → orange', () => {
      addRow('CDX-O2');
      setupRow('Chronic DX', null, 'Chronic diagnosis invalid');
      assertColor('row-status-orange');
    });
    it('No longer applicable → gray', () => {
      addRow('CDX-Gr');
      setupRow('Chronic DX', null, 'No longer applicable');
      assertColor('row-status-gray');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 2: TRACKING #1 DROPDOWN — all options per applicable status
  // ═══════════════════════════════════════════════════════════════════════

  describe('2A: Colon Cancer — ordered (T1 dropdown)', () => {
    ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT'].forEach((t1) => {
      it(`T1=${t1} → blue`, () => {
        addRow(`CCS-O-${t1.slice(0, 4)}`);
        setupRow('Screening', 'Colon Cancer Screening', 'Colon cancer screening ordered');
        setTracking1Dropdown(t1);
        assertColor('row-status-blue');
      });
    });
    // Date + T1 → overdue (Colonoscopy/Sigmoidoscopy=42d, Cologuard/FOBT=21d)
    ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT'].forEach((t1) => {
      it(`T1=${t1} + past date → overdue`, () => {
        addRow(`CCS-O-${t1.slice(0, 4)}-OD`);
        setupRow('Screening', 'Colon Cancer Screening', 'Colon cancer screening ordered');
        setTracking1Dropdown(t1);
        setStatusDate(PAST_DATE);
        assertColor('row-status-overdue');
      });
    });
    it('T1=Colonoscopy + today → still blue', () => {
      addRow('CCS-O-Col-TD');
      setupRow('Screening', 'Colon Cancer Screening', 'Colon cancer screening ordered');
      setTracking1Dropdown('Colonoscopy');
      clickTodayButton();
      assertColor('row-status-blue');
    });
  });

  describe('2B: Colon Cancer — completed (T1 dropdown)', () => {
    ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT'].forEach((t1) => {
      it(`T1=${t1} → green`, () => {
        addRow(`CCS-C-${t1.slice(0, 4)}`);
        setupRow('Screening', 'Colon Cancer Screening', 'Colon cancer screening completed');
        setTracking1Dropdown(t1);
        assertColor('row-status-green');
      });
    });
    // Completed uses baseDueDays=365 (no T1-specific rules); PAST_DATE >365 days ago → overdue
    it('T1=FOBT + past date → overdue (baseDueDays=365)', () => {
      addRow('CCS-C-FOBT-OD');
      setupRow('Screening', 'Colon Cancer Screening', 'Colon cancer screening completed');
      setTracking1Dropdown('FOBT');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });
    it('T1=Colonoscopy + today → still green', () => {
      addRow('CCS-C-Col-TD');
      setupRow('Screening', 'Colon Cancer Screening', 'Colon cancer screening completed');
      setTracking1Dropdown('Colonoscopy');
      clickTodayButton();
      assertColor('row-status-green');
    });
  });

  describe('2C: Breast Cancer — ordered (T1 dropdown)', () => {
    ['Mammogram', 'Breast Ultrasound', 'Breast MRI'].forEach((t1) => {
      it(`T1=${t1} → blue`, () => {
        addRow(`BCS-O-${t1.slice(0, 4)}`);
        setupRow('Screening', 'Breast Cancer Screening', 'Screening test ordered');
        setTracking1Dropdown(t1);
        assertColor('row-status-blue');
      });
    });
    // Date + T1 → overdue (Mammogram/Breast Ultrasound=14d, Breast MRI=21d)
    ['Mammogram', 'Breast Ultrasound', 'Breast MRI'].forEach((t1) => {
      it(`T1=${t1} + past date → overdue`, () => {
        addRow(`BCS-O-${t1.slice(0, 4)}-OD`);
        setupRow('Screening', 'Breast Cancer Screening', 'Screening test ordered');
        setTracking1Dropdown(t1);
        setStatusDate(PAST_DATE);
        assertColor('row-status-overdue');
      });
    });
    it('T1=Mammogram + today → still blue', () => {
      addRow('BCS-O-Mam-TD');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening test ordered');
      setTracking1Dropdown('Mammogram');
      clickTodayButton();
      assertColor('row-status-blue');
    });
  });

  describe('2D: Breast Cancer — completed (T1 dropdown)', () => {
    ['Mammogram', 'Breast Ultrasound', 'Breast MRI'].forEach((t1) => {
      it(`T1=${t1} → green`, () => {
        addRow(`BCS-C-${t1.slice(0, 4)}`);
        setupRow('Screening', 'Breast Cancer Screening', 'Screening test completed');
        setTracking1Dropdown(t1);
        assertColor('row-status-green');
      });
    });
    // Completed uses baseDueDays=365; PAST_DATE >365 days ago → overdue
    it('T1=Mammogram + past date → overdue (baseDueDays=365)', () => {
      addRow('BCS-C-Mam-OD');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening test completed');
      setTracking1Dropdown('Mammogram');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });
    it('T1=Mammogram + today → still green', () => {
      addRow('BCS-C-Mam-TD');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening test completed');
      setTracking1Dropdown('Mammogram');
      clickTodayButton();
      assertColor('row-status-green');
    });
  });

  describe('2E: Screening Discussed — time period (T1 dropdown)', () => {
    ['In 1 Month', 'In 3 Months', 'In 6 Months', 'In 11 Months'].forEach((t1) => {
      it(`BCS: T1=${t1} → yellow`, () => {
        addRow(`SD-${t1.replace(/\s/g, '')}`);
        setupRow('Screening', 'Breast Cancer Screening', 'Screening discussed');
        setTracking1Dropdown(t1);
        assertColor('row-status-yellow');
      });
    });
    // Date + T1 → overdue (In 1 Month=30d, 3 Months=90d, 6 Months=180d, 11 Months=330d)
    ['In 1 Month', 'In 3 Months', 'In 6 Months', 'In 11 Months'].forEach((t1) => {
      it(`T1=${t1} + past date → overdue`, () => {
        addRow(`SD-${t1.replace(/\s/g, '')}-OD`);
        setupRow('Screening', 'Breast Cancer Screening', 'Screening discussed');
        setTracking1Dropdown(t1);
        setStatusDate(PAST_DATE);
        assertColor('row-status-overdue');
      });
    });
    it('T1=In 11 Months + today → still yellow', () => {
      addRow('SD-In11M-TD');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening discussed');
      setTracking1Dropdown('In 11 Months');
      clickTodayButton();
      assertColor('row-status-yellow');
    });
  });

  describe('2F: BP Not at Goal — call frequency (T1 dropdown)', () => {
    ['Call every 1 wk', 'Call every 2 wks', 'Call every 4 wks', 'Call every 8 wks'].forEach((t1) => {
      it(`T1=${t1} → blue`, () => {
        addRow(`HTN-${t1.slice(-4)}`);
        setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP not at goal');
        setTracking1Dropdown(t1);
        assertColor('row-status-blue');
      });
    });
    // Date + T1 → overdue (1 wk=7d, 2 wks=14d, 4 wks=28d, 8 wks=56d)
    ['Call every 1 wk', 'Call every 2 wks', 'Call every 4 wks', 'Call every 8 wks'].forEach((t1) => {
      it(`T1=${t1} + past date → overdue`, () => {
        addRow(`HTN-${t1.slice(-4)}-OD`);
        setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP not at goal');
        setTracking1Dropdown(t1);
        setStatusDate(PAST_DATE);
        assertColor('row-status-overdue');
      });
    });
    it('T1=Call every 8 wks + today → still blue', () => {
      addRow('HTN-8wks-TD');
      setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP not at goal');
      setTracking1Dropdown('Call every 8 wks');
      clickTodayButton();
      assertColor('row-status-blue');
    });
  });

  describe('2G: BP at Goal — call frequency (T1 dropdown)', () => {
    ['Call every 1 wk', 'Call every 4 wks', 'Call every 8 wks'].forEach((t1) => {
      it(`T1=${t1} → blue`, () => {
        addRow(`HTN-AG-${t1.slice(-4)}`);
        setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP at goal');
        setTracking1Dropdown(t1);
        assertColor('row-status-blue');
      });
    });
    // Date + T1 → overdue (1 wk=7d, 4 wks=28d, 8 wks=56d)
    ['Call every 1 wk', 'Call every 4 wks', 'Call every 8 wks'].forEach((t1) => {
      it(`T1=${t1} + past date → overdue`, () => {
        addRow(`HTN-AG-${t1.slice(-4)}-OD`);
        setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP at goal');
        setTracking1Dropdown(t1);
        setStatusDate(PAST_DATE);
        assertColor('row-status-overdue');
      });
    });
    it('T1=Call every 8 wks + today → still blue', () => {
      addRow('HTN-AG-8wk-TD');
      setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP at goal');
      setTracking1Dropdown('Call every 8 wks');
      clickTodayButton();
      assertColor('row-status-blue');
    });
  });

  describe('2H: Chronic DX — resolved/invalid (T1 dropdown)', () => {
    it('Resolved + Attestation not sent → orange', () => {
      addRow('CDX-R-ANS');
      setupRow('Chronic DX', null, 'Chronic diagnosis resolved');
      setTracking1Dropdown('Attestation not sent');
      assertColor('row-status-orange');
    });
    it('Resolved + Attestation sent → green (override)', () => {
      addRow('CDX-R-AS');
      setupRow('Chronic DX', null, 'Chronic diagnosis resolved');
      setTracking1Dropdown('Attestation sent');
      assertColor('row-status-green');
    });
    it('Invalid + Attestation not sent → orange', () => {
      addRow('CDX-I-ANS');
      setupRow('Chronic DX', null, 'Chronic diagnosis invalid');
      setTracking1Dropdown('Attestation not sent');
      assertColor('row-status-orange');
    });
    it('Invalid + Attestation sent → green (override)', () => {
      addRow('CDX-I-AS');
      setupRow('Chronic DX', null, 'Chronic diagnosis invalid');
      setTracking1Dropdown('Attestation sent');
      assertColor('row-status-green');
    });
    // Date + T1 → overdue (Attestation not sent=14d) / never overdue (Attestation sent)
    it('Resolved + Attestation not sent + past → overdue', () => {
      addRow('CDX-R-ANS-OD');
      setupRow('Chronic DX', null, 'Chronic diagnosis resolved');
      setTracking1Dropdown('Attestation not sent');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });
    it('Invalid + Attestation not sent + past → overdue', () => {
      addRow('CDX-I-ANS-OD');
      setupRow('Chronic DX', null, 'Chronic diagnosis invalid');
      setTracking1Dropdown('Attestation not sent');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });
    it('Resolved + Attestation sent + past → stays green (never overdue)', () => {
      addRow('CDX-R-AS-OD');
      setupRow('Chronic DX', null, 'Chronic diagnosis resolved');
      setTracking1Dropdown('Attestation sent');
      setStatusDate(PAST_DATE);
      assertColor('row-status-green');
      assertNotColor('row-status-overdue');
    });
    it('Invalid + Attestation sent + past → stays green (never overdue)', () => {
      addRow('CDX-I-AS-OD');
      setupRow('Chronic DX', null, 'Chronic diagnosis invalid');
      setTracking1Dropdown('Attestation sent');
      setStatusDate(PAST_DATE);
      assertColor('row-status-green');
      assertNotColor('row-status-overdue');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 3: HgbA1c — Tracking #1 text + Tracking #2 dropdown
  // ═══════════════════════════════════════════════════════════════════════

  describe('3: HgbA1c — T1 text + T2 dropdown', () => {
    it('HgbA1c ordered: T1=7.5 + T2=3 months → blue', () => {
      addRow('DC-ord');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c ordered');
      setTracking1Text('7.5');
      setTracking2Dropdown('3 months');
      assertColor('row-status-blue');
    });

    it('HgbA1c at goal: T1=6.2 + T2=6 months → green', () => {
      addRow('DC-goal');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c at goal');
      setTracking1Text('6.2');
      setTracking2Dropdown('6 months');
      assertColor('row-status-green');
    });

    it('HgbA1c NOT at goal: T1=9.1 + T2=1 month → blue', () => {
      addRow('DC-nag');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c NOT at goal');
      setTracking1Text('9.1');
      setTracking2Dropdown('1 month');
      assertColor('row-status-blue');
    });

    // All T2 month options (representative sample)
    ['1 month', '3 months', '6 months', '12 months'].forEach((t2) => {
      it(`HgbA1c ordered + T2=${t2}`, () => {
        addRow(`DC-T2-${t2.replace(/\s/g, '')}`);
        setupRow('Quality', 'Diabetes Control', 'HgbA1c ordered');
        setTracking1Text('7.0');
        setTracking2Dropdown(t2);
        assertColor('row-status-blue');
      });
    });

    // Date + T2 → overdue (T2 month interval drives dueDate for HgbA1c statuses)
    it('HgbA1c ordered + T2=1 month + past → overdue', () => {
      addRow('DC-ord-OD');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c ordered');
      setTracking1Text('8.0');
      setTracking2Dropdown('1 month');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });
    it('HgbA1c at goal + T2=3 months + past → overdue', () => {
      addRow('DC-goal-OD');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c at goal');
      setTracking1Text('6.2');
      setTracking2Dropdown('3 months');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });
    it('HgbA1c NOT at goal + T2=1 month + past → overdue', () => {
      addRow('DC-nag-OD');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c NOT at goal');
      setTracking1Text('9.1');
      setTracking2Dropdown('1 month');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });
    // Today → NOT overdue
    it('HgbA1c ordered + T2=12 months + today → still blue', () => {
      addRow('DC-ord-TD');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c ordered');
      setTracking1Text('7.0');
      setTracking2Dropdown('12 months');
      clickTodayButton();
      assertColor('row-status-blue');
    });
    it('HgbA1c at goal + T2=12 months + today → still green', () => {
      addRow('DC-goal-TD');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c at goal');
      setTracking1Text('6.5');
      setTracking2Dropdown('12 months');
      clickTodayButton();
      assertColor('row-status-green');
    });
    // No T2 set → no dueDate → never overdue even with past date
    it('HgbA1c ordered + NO T2 + past → stays blue (needs T2 for dueDate)', () => {
      addRow('DC-noT2-OD');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c ordered');
      setTracking1Text('7.5');
      setStatusDate(PAST_DATE);
      assertColor('row-status-blue');
      assertNotColor('row-status-overdue');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 4: BP — Tracking #1 dropdown + Tracking #2 text
  // ═══════════════════════════════════════════════════════════════════════

  describe('4: BP — T1 dropdown + T2 text', () => {
    it('BP not at goal: T1=Call every 2 wks + T2=145/92 → blue', () => {
      addRow('HTN-NAG-BP');
      setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP not at goal');
      setTracking1Dropdown('Call every 2 wks');
      setTracking2Text('145/92');
      assertColor('row-status-blue');
    });

    it('BP at goal: T1=Call every 4 wks + T2=128/82 → blue', () => {
      addRow('HTN-AG-BP');
      setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP at goal');
      setTracking1Dropdown('Call every 4 wks');
      setTracking2Text('128/82');
      assertColor('row-status-blue');
    });

    // Date + T1 + T2 → overdue (T1 controls interval: 2 wks=14d, 4 wks=28d)
    it('BP not at goal + T1=Call every 2 wks + T2=145/92 + past → overdue', () => {
      addRow('HTN-NAG-BP-OD');
      setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP not at goal');
      setTracking1Dropdown('Call every 2 wks');
      setTracking2Text('145/92');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });
    it('BP at goal + T1=Call every 4 wks + T2=128/82 + past → overdue', () => {
      addRow('HTN-AG-BP-OD');
      setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP at goal');
      setTracking1Dropdown('Call every 4 wks');
      setTracking2Text('128/82');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });
    // Today → NOT overdue
    it('BP not at goal + T1=Call every 8 wks + T2=140/90 + today → still blue', () => {
      addRow('HTN-NAG-BP-TD');
      setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP not at goal');
      setTracking1Dropdown('Call every 8 wks');
      setTracking2Text('140/90');
      clickTodayButton();
      assertColor('row-status-blue');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 5: DATE ENTRY → OVERDUE TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════

  describe('5A: Past date → overdue (red)', () => {
    it('AWV scheduled + past → overdue (baseDueDays=1)', () => {
      addRow('OD-AWV-S');
      setupRow('AWV', null, 'AWV scheduled');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });

    it('AWV completed + past → overdue (baseDueDays=365)', () => {
      addRow('OD-AWV-C');
      setupRow('AWV', null, 'AWV completed');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });

    it('Patient called to schedule AWV + past → overdue (baseDueDays=7)', () => {
      addRow('OD-AWV-Y');
      setupRow('AWV', null, 'Patient called to schedule AWV');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });

    it('Depression Called to schedule + past → overdue (baseDueDays=7)', () => {
      addRow('OD-DS');
      setupRow('Screening', 'Depression Screening', 'Called to schedule');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });

    it('Vaccination discussed + past → overdue (baseDueDays=7)', () => {
      addRow('OD-VAX');
      setupRow('Quality', 'Vaccination', 'Vaccination discussed');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });

    it('CCS ordered + T1=Cologuard + past → overdue (DueDayRule=21)', () => {
      addRow('OD-CCS');
      setupRow('Screening', 'Colon Cancer Screening', 'Colon cancer screening ordered');
      setTracking1Dropdown('Cologuard');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });

    it('BCS ordered + T1=Mammogram + past → overdue (DueDayRule=14)', () => {
      addRow('OD-BCS');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening test ordered');
      setTracking1Dropdown('Mammogram');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });

    it('HTN BP not at goal + T1=Call every 1 wk + past → overdue (DueDayRule=7)', () => {
      addRow('OD-HTN');
      setupRow('Quality', 'Hypertension Management', 'Scheduled call back - BP not at goal');
      setTracking1Dropdown('Call every 1 wk');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });

    it('Screening discussed + T1=In 1 Month + past → overdue (DueDayRule=30)', () => {
      addRow('OD-SD');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening discussed');
      setTracking1Dropdown('In 1 Month');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });

    it('CDX resolved + Attestation not sent + past → overdue (DueDayRule=14)', () => {
      addRow('OD-CDX');
      setupRow('Chronic DX', null, 'Chronic diagnosis resolved');
      setTracking1Dropdown('Attestation not sent');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });

    it('HgbA1c ordered + T2=1 month + past → overdue', () => {
      addRow('OD-DC');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c ordered');
      setTracking1Text('8.0');
      setTracking2Dropdown('1 month');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
    });
  });

  describe('5B: Today → NOT overdue', () => {
    it('AWV scheduled + today → blue (baseDueDays=1)', () => {
      addRow('TD-AWV-S');
      setupRow('AWV', null, 'AWV scheduled');
      clickTodayButton();
      assertColor('row-status-blue');
    });

    it('Patient called to schedule AWV + today → yellow (baseDueDays=7)', () => {
      addRow('TD-AWV-Y');
      setupRow('AWV', null, 'Patient called to schedule AWV');
      clickTodayButton();
      assertColor('row-status-yellow');
    });

    it('BCS ordered + T1=Mammogram + today → blue', () => {
      addRow('TD-BCS');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening test ordered');
      setTracking1Dropdown('Mammogram');
      clickTodayButton();
      assertColor('row-status-blue');
    });

    it('HgbA1c at goal + T2=12 months + today → green', () => {
      addRow('TD-DC');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c at goal');
      setTracking1Text('6.5');
      setTracking2Dropdown('12 months');
      clickTodayButton();
      assertColor('row-status-green');
    });

    it('Vaccination completed + today → green (baseDueDays=365)', () => {
      addRow('TD-VAX');
      setupRow('Quality', 'Vaccination', 'Vaccination completed');
      clickTodayButton();
      assertColor('row-status-green');
    });
  });

  describe('5C: Terminal statuses NEVER overdue', () => {
    it('Patient declined AWV + past → stays purple', () => {
      addRow('NVR-P');
      setupRow('AWV', null, 'Patient declined AWV');
      setStatusDate(PAST_DATE);
      assertColor('row-status-purple');
      assertNotColor('row-status-overdue');
    });

    it('No longer applicable + past → stays gray', () => {
      addRow('NVR-Gr');
      setupRow('AWV', null, 'No longer applicable');
      setStatusDate(PAST_DATE);
      assertColor('row-status-gray');
      assertNotColor('row-status-overdue');
    });

    it('Screening unnecessary + past → stays gray', () => {
      addRow('NVR-Gr2');
      setupRow('Screening', 'Breast Cancer Screening', 'Screening unnecessary');
      setStatusDate(PAST_DATE);
      assertColor('row-status-gray');
      assertNotColor('row-status-overdue');
    });

    it('Contraindicated + past → stays purple', () => {
      addRow('NVR-P2');
      setupRow('Quality', 'ACE/ARB in DM or CAD', 'Contraindicated');
      setStatusDate(PAST_DATE);
      assertColor('row-status-purple');
      assertNotColor('row-status-overdue');
    });

    it('CDX resolved + Attestation sent + past → stays green (never overdue)', () => {
      addRow('NVR-CDX');
      setupRow('Chronic DX', null, 'Chronic diagnosis resolved');
      setTracking1Dropdown('Attestation sent');
      setStatusDate(PAST_DATE);
      assertColor('row-status-green');
      assertNotColor('row-status-overdue');
    });
  });

  describe('5D: No baseDueDays → no dueDate → NOT overdue', () => {
    it('Not Addressed + past date → stays white', () => {
      addRow('NDD-W');
      setupRow('AWV', null, 'Not Addressed');
      setStatusDate(PAST_DATE);
      assertColor('row-status-white');
    });

    it('HgbA1c ordered + NO tracking2 + past → stays blue (needs T2 for dueDate)', () => {
      addRow('NDD-DC');
      setupRow('Quality', 'Diabetes Control', 'HgbA1c ordered');
      setStatusDate(PAST_DATE);
      assertColor('row-status-blue');
      assertNotColor('row-status-overdue');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 6: TIME INTERVAL EDITING
  // ═══════════════════════════════════════════════════════════════════════

  describe('6: Time Interval Editing', () => {
    it('Overdue → extend interval to 9999 → NOT overdue', () => {
      addRow('TI-extend');
      setupRow('AWV', null, 'Patient called to schedule AWV');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
      // Change interval from 7 to 9999 → pushes dueDate far into the future
      setTimeInterval('9999');
      assertColor('row-status-yellow');
    });

    it('CCS ordered + T1=Colonoscopy + past + extend to 9999 → NOT overdue', () => {
      addRow('TI-CCS');
      setupRow('Screening', 'Colon Cancer Screening', 'Colon cancer screening ordered');
      setTracking1Dropdown('Colonoscopy');
      setStatusDate(PAST_DATE);
      assertColor('row-status-overdue');
      setTimeInterval('9999');
      assertColor('row-status-blue');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 7: SPECIAL CASES
  // ═══════════════════════════════════════════════════════════════════════

  describe('7: Special Cases', () => {
    it('Today button stamps date correctly', () => {
      addRow('SP-Today');
      setupRow('AWV', null, 'Patient called to schedule AWV');
      clickTodayButton();
      // After clicking Today, statusDate should show today's formatted date
      cy.getAgGridCell(0, 'statusDate').invoke('text').should('not.be.empty');
      assertColor('row-status-yellow');
    });

    it('Double-click date entry works', () => {
      addRow('SP-DblClk');
      setupRow('AWV', null, 'AWV scheduled');
      setStatusDate(PAST_DATE);
      // Verify date appeared in cell
      cy.getAgGridCell(0, 'statusDate').invoke('text').should('contain', '2024');
      assertColor('row-status-overdue');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 8: COLOR TRANSITIONS (status change → color changes)
  // ═══════════════════════════════════════════════════════════════════════

  describe('8: Color Transitions', () => {
    it('White → Blue → Green → Purple → Gray', () => {
      addRow('TR');
      setDropdown('requestType', 'AWV');
      // White (Not Addressed is default after setting requestType)
      assertColor('row-status-white');

      setDropdown('measureStatus', 'AWV scheduled');
      assertColor('row-status-blue');

      setDropdown('measureStatus', 'AWV completed');
      assertColor('row-status-green');

      setDropdown('measureStatus', 'Patient declined AWV');
      assertColor('row-status-purple');

      setDropdown('measureStatus', 'No longer applicable');
      assertColor('row-status-gray');
    });

    it('Orange → Green (Chronic DX attestation toggle)', () => {
      addRow('TR-CDX');
      setupRow('Chronic DX', null, 'Chronic diagnosis resolved');
      assertColor('row-status-orange');

      setTracking1Dropdown('Attestation sent');
      assertColor('row-status-green');
    });
  });
});
