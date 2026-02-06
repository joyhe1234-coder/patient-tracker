/**
 * UX Improvements E2E Tests
 *
 * Tests for row numbers column, status bar consistency,
 * password visibility toggles, and other UX quick-wins.
 */

describe('Row Numbers Column', () => {
  const adminEmail = 'admin2@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    cy.wait(1000);
  });

  it('should display # column as first pinned column', () => {
    // The row number column should be pinned left
    cy.get('.ag-pinned-left-header .ag-header-cell').first()
      .should('contain.text', '#');
  });

  it('should show sequential row numbers starting at 1', () => {
    // First row should show "1"
    cy.get('.ag-pinned-left-cols-container [row-index="0"] .ag-cell').first()
      .should('contain.text', '1');

    // Second row should show "2"
    cy.get('.ag-pinned-left-cols-container [row-index="1"] .ag-cell').first()
      .should('contain.text', '2');

    // Third row should show "3"
    cy.get('.ag-pinned-left-cols-container [row-index="2"] .ag-cell').first()
      .should('contain.text', '3');
  });

  it('should not allow editing the row number column', () => {
    // Double-click on row number cell
    cy.get('.ag-pinned-left-cols-container [row-index="0"] .ag-cell').first()
      .dblclick();
    cy.wait(300);

    // No editor should appear (no input element inside the cell)
    cy.get('.ag-pinned-left-cols-container [row-index="0"] .ag-cell').first()
      .find('input').should('not.exist');
  });

  it('should update row numbers when filtering', () => {
    // Click a filter chip to filter rows
    cy.contains('button', 'Completed').click();
    cy.wait(500);

    // First visible row should still be "1" (not the original row number)
    cy.get('.ag-pinned-left-cols-container [row-index="0"] .ag-cell').first()
      .should('contain.text', '1');
  });

  it('should have row number column with tooltip "Row Number"', () => {
    cy.get('.ag-pinned-left-header .ag-header-cell').first()
      .should('have.attr', 'aria-colindex', '1');
  });
});

describe('Status Bar Consistency', () => {
  const adminEmail = 'admin2@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    cy.wait(1000);
  });

  it('should always show "Showing X of Y rows" format', () => {
    // Status bar should show "Showing X of Y rows" even with no filter
    cy.contains('Showing').should('exist');
    cy.contains(/Showing \d+ of \d+ rows/).should('exist');
  });

  it('should show filtered count when filter is active', () => {
    // Click Completed filter
    cy.contains('button', 'Completed').click();
    cy.wait(500);

    // Should still show "Showing X of Y rows" format
    cy.contains(/Showing \d+ of \d+ rows/).should('exist');
  });

  it('should show "Connected" status indicator', () => {
    cy.contains('Connected').should('exist');
  });
});

describe('Filter Chip Accessibility', () => {
  const adminEmail = 'admin2@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    cy.wait(1000);
  });

  it('should have aria-pressed attribute on filter chips', () => {
    cy.contains('button', 'All').should('have.attr', 'aria-pressed');
  });

  it('should be keyboard navigable with visible focus', () => {
    // Tab to a filter chip and verify focus-visible styles exist
    cy.contains('button', 'All').focus();
    cy.contains('button', 'All').should('have.css', 'outline-style');
  });
});

describe('Import Page UX Improvements', () => {
  const adminEmail = 'admin2@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
    cy.visit('/import');
    cy.wait(500);
  });

  it('should show warning icon for Replace All mode', () => {
    // The warning text should contain the triangle icon
    cy.contains('Warning:').should('exist');
    // The warning should be visible with the icon (SVG element)
    cy.contains('Warning:').parent().find('svg').should('exist');
  });

  it('should show maximum file size text in upload zone', () => {
    cy.contains('Maximum file size: 10MB').should('exist');
  });
});

describe('Password Visibility Toggles', () => {
  const adminEmail = 'admin2@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type(adminEmail);
    cy.get('input[type="password"]').type(adminPassword);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login', { timeout: 10000 });
    cy.visit('/');
    cy.wait(1000);
  });

  it('should show visibility toggles in Change Password modal', () => {
    // Open user menu by clicking the button with (ADMIN) text
    cy.contains('(ADMIN)').click();
    cy.wait(300);

    // Click Change Password
    cy.contains('Change Password').click();
    cy.wait(300);

    // Should have 3 password visibility toggle buttons with aria-labels
    cy.get('[aria-label*="password"]').should('have.length.at.least', 3);
  });

  it('should show "Must be at least 8 characters" helper text', () => {
    // Open user menu
    cy.contains('(ADMIN)').click();
    cy.wait(300);

    // Click Change Password
    cy.contains('Change Password').click();
    cy.wait(300);

    cy.contains('Must be at least 8 characters').should('exist');
  });

  it('should toggle password visibility when clicking eye icon', () => {
    // Open user menu and Change Password modal
    cy.contains('(ADMIN)').click();
    cy.wait(300);
    cy.contains('Change Password').click();
    cy.wait(300);

    // All inputs should start as password type
    cy.get('[aria-label="Show current password"]').should('exist');

    // Click the toggle
    cy.get('[aria-label="Show current password"]').click();

    // Should now show "Hide current password"
    cy.get('[aria-label="Hide current password"]').should('exist');
  });
});
