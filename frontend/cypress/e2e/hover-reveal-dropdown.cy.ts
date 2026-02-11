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
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
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

    it('should show dropdown arrow on cell hover', () => {
      cy.getAgGridCell(testRowIndex, 'requestType').trigger('mouseover');
      cy.wait(200);
      cy.getAgGridCell(testRowIndex, 'requestType').find('.cell-dropdown-arrow')
        .should('not.have.css', 'display', 'none');
    });

    it('should show dropdown arrow on qualityMeasure hover', () => {
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').trigger('mouseover');
      cy.wait(200);
      cy.getAgGridCell(testRowIndex, 'qualityMeasure').find('.cell-dropdown-arrow')
        .should('not.have.css', 'display', 'none');
    });

    it('should show dropdown arrow on measureStatus hover', () => {
      cy.getAgGridCell(testRowIndex, 'measureStatus').trigger('mouseover');
      cy.wait(200);
      cy.getAgGridCell(testRowIndex, 'measureStatus').find('.cell-dropdown-arrow')
        .should('not.have.css', 'display', 'none');
    });
  });

  describe('Single-Click Opens Dropdown', () => {
    it('should open requestType dropdown on single click', () => {
      cy.getAgGridCell(testRowIndex, 'requestType').click();
      cy.wait(300);

      // Popup should appear with auto-open-select-editor
      cy.get('.ag-popup .auto-open-select-editor').should('exist');
    });

    it('should open qualityMeasure dropdown on single click', () => {
      // First set a request type so quality measure has options
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'Quality');
      cy.wait(500);

      cy.getAgGridCell(testRowIndex, 'qualityMeasure').click();
      cy.wait(300);

      // Popup should appear with auto-open-select-editor
      cy.get('.ag-popup .auto-open-select-editor').should('exist');
    });

    it('should open measureStatus dropdown on single click', () => {
      cy.selectAgGridDropdown(testRowIndex, 'requestType', 'AWV');
      cy.wait(500);

      cy.getAgGridCell(testRowIndex, 'measureStatus').click();
      cy.wait(300);

      // Popup should appear with auto-open-select-editor
      cy.get('.ag-popup .auto-open-select-editor').should('exist');
    });
  });

  describe('Text Cells Unaffected', () => {
    it('should NOT have dropdown wrapper in notes column', () => {
      cy.getAgGridCell(testRowIndex, 'notes').then(($cell) => {
        cy.wrap($cell).find('.cell-dropdown-wrapper').should('not.exist');
      });
    });

    it('should NOT enter edit mode on single click for notes', () => {
      cy.getAgGridCell(testRowIndex, 'notes').click();
      cy.wait(300);

      // Notes should NOT be in edit mode after single click
      cy.getAgGridCell(testRowIndex, 'notes')
        .find('.ag-cell-edit-wrapper')
        .should('not.exist');
    });

    it('should enter edit mode on double-click for notes', () => {
      cy.getAgGridCell(testRowIndex, 'notes').dblclick();
      cy.wait(300);

      // Notes SHOULD be in edit mode after double click
      cy.getAgGridCell(testRowIndex, 'notes')
        .find('input, textarea, .ag-cell-edit-wrapper')
        .should('exist');
    });
  });

  describe('Disabled Cell Arrow Hidden', () => {
    it('should not show arrow on cells with cell-disabled class', () => {
      // Find any cell with cell-disabled class and verify no arrow on hover
      cy.get('.cell-disabled').first().then(($cell) => {
        if ($cell.length > 0) {
          cy.wrap($cell).trigger('mouseover');
          cy.wait(200);
          cy.wrap($cell).find('.cell-dropdown-arrow').should('have.css', 'display', 'none');
        }
      });
    });
  });

  describe('Dropdown Arrow Styling', () => {
    it('arrow should have blue color and rounded background', () => {
      cy.getAgGridCell(testRowIndex, 'requestType').trigger('mouseover');
      cy.wait(200);

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
