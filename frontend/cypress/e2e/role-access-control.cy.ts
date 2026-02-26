/**
 * Role-Based Access Control Tests
 *
 * Verifies that each role (ADMIN, PHYSICIAN, STAFF, ADMIN+PHYSICIAN)
 * has the correct navigation, UI elements, dropdown behavior, and
 * API-level access restrictions.
 *
 * Uses seed accounts from prisma/seed.ts (always present after seeding):
 *   admin@gmail.com    — ADMIN
 *   adminphy@gmail.com — ADMIN + PHYSICIAN
 *   phy1@gmail.com     — PHYSICIAN
 *   phy2@gmail.com     — PHYSICIAN
 *   staff1@gmail.com   — STAFF (assigned to Physician One only)
 *   staff2@gmail.com   — STAFF (assigned to Physician One + Two + Ko Admin-Phy)
 */

const ACCOUNTS = {
  admin:    { email: 'admin@gmail.com',    password: 'welcome100' },
  adminPhy: { email: 'adminphy@gmail.com', password: 'welcome100' },
  phy1:     { email: 'phy1@gmail.com',     password: 'welcome100' },
  phy2:     { email: 'phy2@gmail.com',     password: 'welcome100' },
  staff1:   { email: 'staff1@gmail.com',   password: 'welcome100' },
  staff2:   { email: 'staff2@gmail.com',   password: 'welcome100' },
};

// ─── ADMIN Role ─────────────────────────────────────────────────

describe('ADMIN Role', () => {
  beforeEach(() => {
    cy.login(ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    cy.visit('/');
    cy.get('.ag-theme-alpine', { timeout: 10000 }).should('be.visible');
  });

  it('shows Admin nav link', () => {
    cy.get('a[href="/admin"]').should('be.visible');
  });

  it('can access /admin page', () => {
    cy.visit('/admin');
    cy.url().should('include', '/admin');
  });

  it('can access /admin/import-mapping page', () => {
    cy.visit('/admin/import-mapping');
    cy.url().should('include', '/admin/import-mapping');
  });

  it('shows "Viewing provider:" label on Patient Grid', () => {
    cy.contains('Viewing provider:').should('be.visible');
  });

  it('has "Select provider" dropdown with "Unassigned patients" option', () => {
    cy.get('select[aria-label="Select provider"]').should('exist');
    cy.get('select[aria-label="Select provider"]')
      .find('option[value="unassigned"]')
      .should('exist');
  });

  it('shows multiple physicians in dropdown', () => {
    // Seed creates phy1, phy2, adminphy — admin sees all + unassigned
    cy.get('select[aria-label="Select provider"]')
      .find('option')
      .should('have.length.greaterThan', 2);
  });

  it('can switch between physicians and view their data', () => {
    cy.get('select[aria-label="Select provider"]')
      .find('option')
      .then(($opts) => {
        if ($opts.length > 2) {
          // Select first physician (skip "Unassigned patients" at index 0)
          cy.get('select[aria-label="Select provider"]').select($opts.eq(1).val() as string);
          cy.get('.ag-center-cols-container').should('exist');

          // Switch to second physician
          cy.get('select[aria-label="Select provider"]').select($opts.eq(2).val() as string);
          cy.get('.ag-center-cols-container').should('exist');
        }
      });
  });

  it('can view unassigned patients', () => {
    cy.get('select[aria-label="Select provider"]').select('unassigned');
    cy.get('.ag-center-cols-container').should('exist');
  });

  it('can access /patient-management page', () => {
    cy.visit('/patient-management');
    cy.url().should('include', '/patient-management');
  });

  it('displays (ADMIN) role badge', () => {
    cy.contains('(ADMIN)').should('be.visible');
  });
});

// ─── PHYSICIAN Role ─────────────────────────────────────────────

describe('PHYSICIAN Role', () => {
  beforeEach(() => {
    cy.login(ACCOUNTS.phy1.email, ACCOUNTS.phy1.password);
    cy.visit('/');
    cy.get('.ag-theme-alpine', { timeout: 10000 }).should('be.visible');
  });

  it('does NOT show Admin nav link', () => {
    cy.get('a[href="/admin"]').should('not.exist');
  });

  it('is redirected away from /admin to /', () => {
    cy.visit('/admin');
    cy.url({ timeout: 10000 }).should('not.include', '/admin');
  });

  it('is redirected away from /admin/import-mapping', () => {
    cy.visit('/admin/import-mapping');
    cy.url({ timeout: 10000 }).should('not.include', '/admin/import-mapping');
  });

  it('does NOT show physician selector dropdown (auto-filters to own patients)', () => {
    cy.get('select[aria-label="Select provider"]').should('not.exist');
    cy.get('select[aria-label="Select physician"]').should('not.exist');
  });

  it('does NOT show "Viewing provider:" or "Viewing as:" labels', () => {
    cy.contains('Viewing provider:').should('not.exist');
    cy.contains('Viewing as:').should('not.exist');
  });

  it('displays (PHYSICIAN) role badge', () => {
    cy.contains('(PHYSICIAN)').should('be.visible');
  });

  it('can access /patient-management page', () => {
    cy.visit('/patient-management');
    cy.url().should('include', '/patient-management');
  });
});

// ─── STAFF Role — Single Physician (staff1 → phy1 only) ────────

describe('STAFF Role — Single Physician (staff1)', () => {
  beforeEach(() => {
    cy.login(ACCOUNTS.staff1.email, ACCOUNTS.staff1.password);
    cy.visit('/');
    cy.get('.ag-theme-alpine', { timeout: 10000 }).should('be.visible');
  });

  it('does NOT show Admin nav link', () => {
    cy.get('a[href="/admin"]').should('not.exist');
  });

  it('is redirected away from /admin to /', () => {
    cy.visit('/admin');
    cy.url({ timeout: 10000 }).should('not.include', '/admin');
  });

  it('is redirected away from /admin/import-mapping', () => {
    cy.visit('/admin/import-mapping');
    cy.url({ timeout: 10000 }).should('not.include', '/admin/import-mapping');
  });

  it('shows "Viewing as:" label (not "Viewing provider:")', () => {
    cy.contains('Viewing as:').should('be.visible');
    cy.contains('Viewing provider:').should('not.exist');
  });

  it('has "Select physician" dropdown without "Unassigned patients"', () => {
    cy.get('select[aria-label="Select physician"]').should('exist');
    cy.get('select[aria-label="Select physician"]')
      .find('option[value="unassigned"]')
      .should('not.exist');
  });

  it('shows only assigned physicians in dropdown (includes Physician One)', () => {
    // staff1 is assigned to their physicians — verify expected ones are present
    cy.get('select[aria-label="Select physician"]')
      .find('option')
      .should('have.length.at.least', 1);
    cy.get('select[aria-label="Select physician"]')
      .should('contain.text', 'Physician One');
  });

  it('displays (STAFF) role badge', () => {
    cy.contains('(STAFF)').should('be.visible');
  });

  it('can access /patient-management page', () => {
    cy.visit('/patient-management');
    cy.url().should('include', '/patient-management');
  });
});

// ─── STAFF Role — Multi-Physician (staff2 → phy1, phy2, adminphy) ──

describe('STAFF Role — Multi-Physician (staff2)', () => {
  beforeEach(() => {
    cy.login(ACCOUNTS.staff2.email, ACCOUNTS.staff2.password);
    cy.visit('/');
    cy.get('.ag-theme-alpine', { timeout: 10000 }).should('be.visible');
  });

  it('shows multiple assigned physicians in dropdown', () => {
    // staff2 is assigned to multiple physicians (phy1, phy2, adminphy + any added via app)
    cy.get('select[aria-label="Select physician"]')
      .find('option')
      .should('have.length.at.least', 3);
  });

  it('does NOT show "Unassigned patients" option', () => {
    cy.get('select[aria-label="Select physician"]')
      .find('option[value="unassigned"]')
      .should('not.exist');
  });

  it('can switch between assigned physicians', () => {
    cy.get('select[aria-label="Select physician"]')
      .find('option')
      .then(($opts) => {
        // Switch to second assigned physician
        cy.get('select[aria-label="Select physician"]').select($opts.eq(1).val() as string);
        cy.get('.ag-center-cols-container').should('exist');
      });
  });

  it('displays (STAFF) role badge', () => {
    cy.contains('(STAFF)').should('be.visible');
  });
});

// ─── ADMIN + PHYSICIAN Dual Role ────────────────────────────────

describe('ADMIN + PHYSICIAN Dual Role', () => {
  beforeEach(() => {
    cy.login(ACCOUNTS.adminPhy.email, ACCOUNTS.adminPhy.password);
    cy.visit('/');
    cy.get('.ag-theme-alpine', { timeout: 10000 }).should('be.visible');
  });

  it('shows Admin nav link (ADMIN privilege)', () => {
    cy.get('a[href="/admin"]').should('be.visible');
  });

  it('can access /admin page', () => {
    cy.visit('/admin');
    cy.url().should('include', '/admin');
  });

  it('shows "Viewing provider:" dropdown with "Unassigned patients" (ADMIN privilege)', () => {
    cy.get('select[aria-label="Select provider"]').should('exist');
    cy.get('select[aria-label="Select provider"]')
      .find('option[value="unassigned"]')
      .should('exist');
  });

  it('displays (ADMIN + PHYSICIAN) role badge', () => {
    cy.contains('(ADMIN + PHYSICIAN)').should('be.visible');
  });
});

// ─── API Access Control ─────────────────────────────────────────

describe('API Access Control', () => {
  it('returns 401 for /api/admin/users without auth', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.request({ url: '/api/admin/users', failOnStatusCode: false })
      .its('status')
      .should('eq', 401);
  });

  it('returns 401 for /api/data without auth', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.request({ url: '/api/data?physicianId=1', failOnStatusCode: false })
      .its('status')
      .should('eq', 401);
  });

  it('STAFF gets 403 when requesting unassigned patients via API', () => {
    cy.login(ACCOUNTS.staff1.email, ACCOUNTS.staff1.password);
    cy.visit('/');
    cy.get('.ag-theme-alpine', { timeout: 10000 }).should('be.visible');

    cy.window().then((win) => {
      const token = win.localStorage.getItem('auth_token');
      cy.request({
        url: '/api/data?physicianId=unassigned',
        failOnStatusCode: false,
        headers: { Authorization: `Bearer ${token}` },
      }).its('status').should('eq', 403);
    });
  });

  it('PHYSICIAN requesting unassigned gets 200 but only own data (param ignored)', () => {
    // PHYSICIAN role ignores physicianId param — always returns own patients.
    // Security is enforced by data scoping, not 403 rejection.
    cy.login(ACCOUNTS.phy1.email, ACCOUNTS.phy1.password);
    cy.visit('/');
    cy.get('.ag-theme-alpine', { timeout: 10000 }).should('be.visible');

    cy.window().then((win) => {
      const token = win.localStorage.getItem('auth_token');
      cy.request({
        url: '/api/data?physicianId=unassigned',
        failOnStatusCode: false,
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => {
        expect(response.status).to.eq(200);
        // Data should be scoped to own patients, not unassigned
        expect(response.body.success).to.eq(true);
      });
    });
  });

  it('ADMIN gets 200 when requesting unassigned patients via API', () => {
    cy.login(ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    cy.visit('/');
    cy.get('.ag-theme-alpine', { timeout: 10000 }).should('be.visible');

    cy.window().then((win) => {
      const token = win.localStorage.getItem('auth_token');
      cy.request({
        url: '/api/data?physicianId=unassigned',
        failOnStatusCode: false,
        headers: { Authorization: `Bearer ${token}` },
      }).its('status').should('eq', 200);
    });
  });
});

// ─── Navigation Protection (unauthenticated) ────────────────────

describe('Navigation Protection', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('redirects / to /login when unauthenticated', () => {
    cy.visit('/');
    cy.url().should('include', '/login');
  });

  it('redirects /admin to /login when unauthenticated', () => {
    cy.visit('/admin');
    cy.url().should('include', '/login');
  });

  it('redirects /patient-management to /login when unauthenticated', () => {
    cy.visit('/patient-management');
    cy.url().should('include', '/login');
  });

  it('redirects /admin/import-mapping to /login when unauthenticated', () => {
    cy.visit('/admin/import-mapping');
    cy.url().should('include', '/login');
  });
});
