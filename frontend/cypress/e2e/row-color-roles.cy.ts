/**
 * Row Color — Multi-Role E2E Tests
 *
 * Verifies row color logic works correctly for ALL user roles:
 *   - ADMIN (admin@gmail.com)
 *   - PHYSICIAN (phy1@gmail.com)
 *   - STAFF (staff1@gmail.com)
 *
 * Each role runs the same 8 core scenarios:
 *   1. AWV scheduled + past date → overdue (red)
 *   2. AWV scheduled + Today → blue
 *   3. Screening → CCS → ordered → blue
 *   4. CCS ordered + Tracking1=Colonoscopy → blue
 *   5. CCS + Colonoscopy + past date → overdue
 *   6. HgbA1c + T2=3 months + past date → overdue
 *   7. BP not at goal + T1=Call every 1 wk + past date → overdue
 *   8. Screening discussed + T1=In 1 Month + past date → overdue
 *
 * Uses gridApi.startEditingCell() for reliable dropdown interactions
 * and dblclick('left') for date entry (avoids Today button overlay).
 *
 * Run: npx cypress run --spec "cypress/e2e/row-color-roles.cy.ts" --headed
 */

const ROLES = [
  { name: 'Admin', email: 'admin@gmail.com', password: 'welcome100' },
  { name: 'Physician', email: 'phy1@gmail.com', password: 'welcome100' },
  { name: 'Staff', email: 'staff1@gmail.com', password: 'welcome100' },
] as const;

ROLES.forEach((role) => {
  describe(`Row Color — ${role.name} (${role.email})`, () => {
    const RUN = Date.now().toString(36).slice(-4);
    let counter = 0;

    beforeEach(() => {
      cy.login(role.email, role.password);
      cy.visit('/');
      cy.waitForAgGrid();
    });

    // ── Helpers ──────────────────────────────────────────────────────

    function addRow(tag: string) {
      counter++;
      cy.addTestRow(`${RUN}${counter}-${tag}, ${role.name}`);
      cy.get('body').type('{esc}');
      cy.wait(500);
    }

    /** Select dropdown value and wait for save to settle */
    function selectAndWait(colId: string, value: string) {
      cy.selectAgGridDropdownAndVerify(0, colId, value);
      cy.wait(1500);
    }

    /** Enter date via dblclick on LEFT side (avoids Today button) */
    function enterDate(dateStr: string) {
      cy.get('[row-index="0"] [col-id="statusDate"]').first()
        .dblclick('left', { force: true });
      cy.get('.date-cell-editor', { timeout: 5000 }).should('exist');
      cy.get('.date-cell-editor').clear().type(`${dateStr}{enter}`);
      cy.wait(2000);
    }

    /** Click Today button on status date cell */
    function clickToday() {
      cy.get('[row-index="0"] [col-id="statusDate"]').first()
        .find('.status-date-today-btn', { timeout: 5000 })
        .should('exist')
        .click({ force: true });
      cy.wait(2000);
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

    function assertColor(cls: string) {
      cy.get('[row-index="0"]').first().should('have.class', cls);
    }

    // ── Tests ────────────────────────────────────────────────────────

    it('1. AWV scheduled + past date → overdue', () => {
      addRow('AWV-past');
      selectAndWait('requestType', 'AWV');
      selectAndWait('measureStatus', 'AWV scheduled');
      enterDate('1/1/2024');
      assertColor('row-status-overdue');
    });

    it('2. AWV scheduled + Today → blue', () => {
      addRow('AWV-today');
      selectAndWait('requestType', 'AWV');
      selectAndWait('measureStatus', 'AWV scheduled');
      clickToday();
      assertColor('row-status-blue');
    });

    it('3. Screening → CCS → ordered → blue', () => {
      addRow('CCS-blue');
      selectAndWait('requestType', 'Screening');
      selectAndWait('qualityMeasure', 'Colon Cancer Screening');
      selectAndWait('measureStatus', 'Colon cancer screening ordered');
      assertColor('row-status-blue');
    });

    it('4. CCS ordered + T1=Colonoscopy → blue', () => {
      addRow('CCS-T1');
      selectAndWait('requestType', 'Screening');
      selectAndWait('qualityMeasure', 'Colon Cancer Screening');
      selectAndWait('measureStatus', 'Colon cancer screening ordered');
      scrollRight();
      selectAndWait('tracking1', 'Colonoscopy');
      scrollLeft();
      assertColor('row-status-blue');
    });

    it('5. CCS + Colonoscopy + past date → overdue', () => {
      addRow('CCS-overdue');
      selectAndWait('requestType', 'Screening');
      selectAndWait('qualityMeasure', 'Colon Cancer Screening');
      selectAndWait('measureStatus', 'Colon cancer screening ordered');
      scrollRight();
      selectAndWait('tracking1', 'Colonoscopy');
      scrollLeft();
      enterDate('1/1/2024');
      assertColor('row-status-overdue');
    });

    it('6. HgbA1c + T2=3 months + past date → overdue', () => {
      addRow('HgA1c-overdue');
      selectAndWait('requestType', 'Quality');
      selectAndWait('qualityMeasure', 'Diabetes Control');
      selectAndWait('measureStatus', 'HgbA1c ordered');
      scrollRight();
      selectAndWait('tracking2', '3 months');
      scrollLeft();
      enterDate('1/1/2024');
      assertColor('row-status-overdue');
    });

    it('7. BP not at goal + T1=Call every 1 wk + past date → overdue', () => {
      addRow('BP-overdue');
      selectAndWait('requestType', 'Quality');
      selectAndWait('qualityMeasure', 'Hypertension Management');
      selectAndWait('measureStatus', 'Scheduled call back - BP not at goal');
      scrollRight();
      selectAndWait('tracking1', 'Call every 1 wk');
      scrollLeft();
      enterDate('1/1/2024');
      assertColor('row-status-overdue');
    });

    it('8. Screening discussed + T1=In 1 Month + past date → overdue', () => {
      addRow('BCS-overdue');
      selectAndWait('requestType', 'Screening');
      selectAndWait('qualityMeasure', 'Breast Cancer Screening');
      selectAndWait('measureStatus', 'Screening discussed');
      scrollRight();
      selectAndWait('tracking1', 'In 1 Month');
      scrollLeft();
      enterDate('1/1/2024');
      assertColor('row-status-overdue');
    });
  });
});
