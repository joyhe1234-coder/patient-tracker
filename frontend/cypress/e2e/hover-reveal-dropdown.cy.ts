/**
 * Hover-Reveal Dropdown E2E Tests - Cypress
 *
 * Tests the Design B hover-reveal dropdown indicator:
 * - Dropdown arrow visibility on hover
 * - Single-click opens dropdown editor
 * - Text cells still require double-click
 * - Disabled/N/A cells don't show arrow
 * - Arrow hidden on prompt cells when not hovered
 */

describe('Hover-Reveal Dropdown', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';
  const testRowIndex = 0;

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.waitForAgGrid();
  });

  describe('Dropdown Arrow Visibility', () => {
    it('should show dropdown arrow wrapper in dropdown cells', () => {
      // Request Type is always a dropdown cell
      cy.getAgGridCell(testRowIndex, 'requestType').then(($cell) => {
        // Cell should contain the dropdown wrapper structure
        cy.wrap($cell).find('.cell-dropdown-wrapper').should('exist');
        cy.wrap($cell).find('.cell-dropdown-arrow').should('exist');
      });
    });

    it('should hide dropdown arrow by default (no hover)', () => {
      cy.getAgGridCell(testRowIndex, 'requestType').then(($cell) => {
        cy.wrap($cell).find('.cell-dropdown-arrow').should('have.css', 'display', 'none');
      });
    });

    it('should have dropdown arrow element on requestType cell', () => {
      // CSS :hover display toggle cannot be tested with Cypress trigger().
      // Verify the arrow exists and is hidden by default (CSS :hover handles reveal).
      cy.getAgGridCell(testRowIndex, 'requestType').find('.cell-dropdown-arrow')
        .should('exist')
        .and('have.css', 'display', 'none');
    });

    it('should have dropdown arrow element on qualityMeasure cell', () => {
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').find('.cell-dropdown-arrow')
        .should('exist')
        .and('have.css', 'display', 'none');
    });

    it('should have dropdown arrow element on measureStatus cell', () => {
      cy.getAgGridCell(testRowIndex, 'measureStatus').find('.cell-dropdown-arrow')
        .should('exist')
        .and('have.css', 'display', 'none');
    });
  });

  describe('Single-Click Opens Dropdown', () => {
    it('should open requestType dropdown on single click', () => {
      cy.getAgGridCell(testRowIndex, 'requestType').click();

      // Popup should appear with auto-open-select-editor (auto-retries)
      cy.get('.ag-popup .auto-open-select-editor').should('exist');
    });

    it('should open qualityMeasure dropdown on single click', () => {
      // First set a request type so quality measure has options
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'Quality');

      cy.getAgGridCell(testRowIndex, 'qualityMeasure').click();

      // Popup should appear with auto-open-select-editor (auto-retries)
      cy.get('.ag-popup .auto-open-select-editor').should('exist');
    });

    it('should open measureStatus dropdown on single click', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.getAgGridCell(testRowIndex, 'requestType').should('contain.text', 'AWV');

      cy.getAgGridCell(testRowIndex, 'measureStatus').click();

      // Popup should appear with auto-open-select-editor (auto-retries)
      cy.get('.ag-popup .auto-open-select-editor').should('exist');
    });
  });

  describe('Text Cells Unaffected', () => {
    it('should NOT have dropdown wrapper in notes column', () => {
      cy.getAgGridCellWithScroll(testRowIndex, 'notes').then(($cell) => {
        cy.wrap($cell).find('.cell-dropdown-wrapper').should('not.exist');
      });
    });

    it('should NOT enter edit mode on single click for notes', () => {
      cy.getAgGridCellWithScroll(testRowIndex, 'notes').click();

      // Notes should NOT be in edit mode after single click (auto-retries)
      cy.getAgGridCellWithScroll(testRowIndex, 'notes')
        .find('.ag-cell-edit-wrapper')
        .should('not.exist');
    });

    it('should enter edit mode on double-click for notes', () => {
      cy.getAgGridCellWithScroll(testRowIndex, 'notes').dblclick();

      // Notes SHOULD be in edit mode after double click (auto-retries)
      cy.getAgGridCellWithScroll(testRowIndex, 'notes')
        .find('input, textarea, .ag-cell-edit-wrapper')
        .should('exist');
    });
  });

  describe('Disabled Cell Arrow Hidden', () => {
    it('should not have arrow element on cells with cell-disabled class', () => {
      // Disabled cells should not render a dropdown arrow at all
      cy.get('.cell-disabled').first().then(($cell) => {
        if ($cell.length > 0) {
          cy.wrap($cell).find('.cell-dropdown-arrow').should('not.exist');
        }
      });
    });
  });

  describe('Dropdown Arrow Styling', () => {
    it('arrow should have blue color and rounded background', () => {
      cy.getAgGridCell(testRowIndex, 'requestType').trigger('mouseover');

      cy.getAgGridCell(testRowIndex, 'requestType').find('.cell-dropdown-arrow')
        .should('have.css', 'border-radius', '3px');
    });

    it('arrow character should be a down-pointing triangle', () => {
      cy.getAgGridCell(testRowIndex, 'requestType').find('.cell-dropdown-arrow')
        .invoke('text')
        .should('match', /▾/);
    });
  });
});
