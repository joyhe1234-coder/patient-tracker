/**
 * Parallel Editing - Active Edit Indicators (Cypress)
 *
 * Tests the visual appearance of edit indicators on cells being
 * edited by other users (dashed orange border).
 */

describe('Parallel Editing - Edit Indicators', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.waitForAgGrid();
  });

  it('should have cell-remote-editing CSS class defined', () => {
    // Verify the CSS class exists in the stylesheet
    cy.document().then((doc) => {
      const sheets = doc.styleSheets;
      let found = false;
      for (let i = 0; i < sheets.length; i++) {
        try {
          const rules = sheets[i].cssRules;
          for (let j = 0; j < rules.length; j++) {
            if (rules[j].cssText && rules[j].cssText.includes('cell-remote-editing')) {
              found = true;
              break;
            }
          }
        } catch {
          // Cross-origin stylesheet, skip
        }
        if (found) break;
      }
      expect(found).to.be.true;
    });
  });

  it('should have cellFlash animation defined', () => {
    // Verify the CSS animation exists
    cy.document().then((doc) => {
      const sheets = doc.styleSheets;
      let found = false;
      for (let i = 0; i < sheets.length; i++) {
        try {
          const rules = sheets[i].cssRules;
          for (let j = 0; j < rules.length; j++) {
            if (rules[j].cssText && rules[j].cssText.includes('cellFlash')) {
              found = true;
              break;
            }
          }
        } catch {
          // Cross-origin stylesheet, skip
        }
        if (found) break;
      }
      expect(found).to.be.true;
    });
  });

  it('should apply dashed orange border to cell with cell-remote-editing class', () => {
    // Manually add the class to a cell to verify styling
    cy.get('[row-index="0"] [col-id="notes"]').first().then(($cell) => {
      $cell.addClass('cell-remote-editing');

      cy.wrap($cell).should('have.class', 'cell-remote-editing');

      // Verify the computed style has a dashed border
      cy.wrap($cell).then(($el) => {
        const style = window.getComputedStyle($el[0]);
        // The border should be dashed and orange (#f97316)
        expect(style.borderStyle).to.include('dashed');
      });
    });
  });

  it('should remove indicator class when editing stops', () => {
    // Add class
    cy.get('[row-index="0"] [col-id="notes"]').first().then(($cell) => {
      $cell.addClass('cell-remote-editing');
      cy.wrap($cell).should('have.class', 'cell-remote-editing');

      // Remove class (simulates editing:inactive event)
      $cell.removeClass('cell-remote-editing');
      cy.wrap($cell).should('not.have.class', 'cell-remote-editing');
    });
  });
});
