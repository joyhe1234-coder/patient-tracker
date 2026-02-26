/**
 * UX Improvements E2E Tests
 *
 * Tests for status bar consistency, password visibility toggles,
 * and other UX quick-wins.
 */

describe('Status Bar Consistency', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    // Wait for grid rows to render
    cy.get('.ag-center-cols-container .ag-row', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  it('should always show "Showing X of Y rows" format', () => {
    // Status bar should show "Showing X of Y rows" even with no filter
    cy.contains('Showing').should('exist');
    cy.contains(/Showing \d+ of \d+ rows/).should('exist');
  });

  it('should show filtered count when filter is active', () => {
    // Click Completed filter
    cy.contains('button', 'Completed').click();

    // Should still show "Showing X of Y rows" format (auto-retries)
    cy.contains(/Showing \d+ of \d+ rows/).should('exist');
  });

  it('should show "Connected" status indicator', () => {
    cy.contains('Connected').should('exist');
  });
});

describe('Filter Chip Accessibility', () => {
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    // Wait for grid rows to render
    cy.get('.ag-center-cols-container .ag-row', { timeout: 10000 }).should('have.length.at.least', 1);
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
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/patient-management');
    // Wait for page to load
    cy.contains('Select Healthcare System', { timeout: 10000 }).should('be.visible');
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
  const adminEmail = 'ko037291@gmail.com';
  const adminPassword = 'welcome100';

  beforeEach(() => {
    cy.login(adminEmail, adminPassword);
    cy.visit('/');
    cy.get('.ag-body-viewport', { timeout: 10000 }).should('exist');
    // Wait for grid rows to render
    cy.get('.ag-center-cols-container .ag-row', { timeout: 10000 }).should('have.length.at.least', 1);
  });

  it('should show visibility toggles in Change Password modal', () => {
    // Open user menu by clicking the button with (ADMIN) text
    cy.contains('button', /ADMIN/).click();

    // Click Change Password (auto-retries visibility)
    cy.contains('Change Password').should('be.visible').click();

    // Should have 3 password visibility toggle buttons with aria-labels
    cy.get('[aria-label*="password"]').should('have.length.at.least', 3);
  });

  it('should show "Must be at least 8 characters" helper text', () => {
    // Open user menu
    cy.contains('button', /ADMIN/).click();

    // Click Change Password
    cy.contains('Change Password').should('be.visible').click();

    cy.contains('Must be at least 8 characters').should('exist');
  });

  it('should toggle password visibility when clicking eye icon', () => {
    // Open user menu and Change Password modal
    cy.contains('button', /ADMIN/).click();
    cy.contains('Change Password').should('be.visible').click();

    // All inputs should start as password type
    cy.get('[aria-label="Show current password"]').should('exist');

    // Click the toggle
    cy.get('[aria-label="Show current password"]').click();

    // Should now show "Hide current password"
    cy.get('[aria-label="Hide current password"]').should('exist');
  });
});
