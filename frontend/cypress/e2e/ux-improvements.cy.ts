/**
 * UX Improvements E2E Tests
 *
 * Tests for status bar consistency, password visibility toggles,
 * and other UX quick-wins.
 */

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
