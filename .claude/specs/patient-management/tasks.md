# Implementation Plan: Patient Management Page

## Task Overview

Frontend-only restructuring to combine Import page and Patient Assignment page into a unified tabbed Patient Management page. No backend changes. 9 atomic tasks covering: new page component, refactoring existing pages into tab content, route changes, navigation updates, redirects, tests, and documentation.

## Steering Document Compliance

- **structure.md**: New page follows `PascalCase + Page` naming (`PatientManagementPage.tsx`), tests follow `.test.tsx` / `.spec.ts` conventions
- **tech.md**: React + TypeScript, React Router v6, Tailwind CSS, Zustand authStore, no new dependencies
- **Git workflow**: All work on `develop` branch

## Tasks

- [x] 1. Create PatientManagementPage with tab navigation
  - **Create:** `frontend/src/pages/PatientManagementPage.tsx`
  - Create the container page component with:
    - Tab bar UI using Tailwind (active: `border-b-2 border-blue-600 text-blue-600 font-semibold`, inactive: `text-gray-500 hover:text-gray-700`)
    - `useSearchParams` for reading/writing `?tab=` URL param
    - `useAuthStore` for role-based tab visibility (ADMIN sees both tabs, others see Import only)
    - Tab resolution logic: invalid params and unauthorized `?tab=reassign` fall back to 'import'
    - `document.title` update per active tab
    - Page header: "Patient Management" with icon
  - Both tab content areas rendered (hidden via `display:none` when inactive) to preserve form state across tab switches
  - Placeholder `<div>` for each tab with text like "Import content" / "Reassign content" (replaced in tasks 2-3)
  - _Leverage: `frontend/src/pages/AdminPage.tsx` (page pattern), `frontend/src/stores/authStore.ts`_
  - _Requirements: 1.1-1.7, 5.1-5.6_

- [x] 2. Extract ImportTabContent from ImportPage
  - **Modify:** `frontend/src/pages/ImportPage.tsx` → refactor into `ImportTabContent`
  - **Modify:** `frontend/src/pages/PatientManagementPage.tsx` — import and render `ImportTabContent`
  - Extract the import form from `ImportPage.tsx` into an exported `ImportTabContent` component (stays in `ImportPage.tsx`):
    - Strip outer wrapper (`max-w-2xl mx-auto p-6`), `<h1>` header, and subtitle
    - Keep ALL state, logic, drag-drop, validation, physician selector unchanged
    - Update `navigate('/import/preview/${previewId}')` → `navigate('/patient-management/preview/${previewId}')`
  - Keep default export `ImportPage` as a thin wrapper that renders `<ImportTabContent />` (backwards compat)
  - In `PatientManagementPage.tsx`: `import { ImportTabContent } from './ImportPage'` and render in Import tab
  - _Leverage: `frontend/src/pages/ImportPage.tsx` (274 lines, 100% reuse)_
  - _Requirements: 3.1-3.6_

- [x] 3. Extract ReassignTabContent from PatientAssignmentPage
  - **Modify:** `frontend/src/pages/PatientAssignmentPage.tsx` → refactor into `ReassignTabContent`
  - **Modify:** `frontend/src/pages/PatientManagementPage.tsx` — import and render `ReassignTabContent`
  - Extract the assignment UI from `PatientAssignmentPage.tsx` into an exported `ReassignTabContent` component (stays in `PatientAssignmentPage.tsx`):
    - Accept `isActive: boolean` prop
    - Add `hasActivated` ref — only call `loadData()` when `isActive` first becomes `true`
    - Show loading spinner on first activation while fetching
    - Strip outer wrapper (`max-w-6xl mx-auto p-6`), `<h1>` header, and "Back to Admin" link
    - Keep ALL state, logic, select-all, bulk-assign unchanged
  - Keep default export `PatientAssignmentPage` as thin wrapper (backwards compat)
  - In `PatientManagementPage.tsx`: `import { ReassignTabContent } from './PatientAssignmentPage'` and render in Reassign tab (hidden via `display:none` when inactive, `isActive` prop controls data fetch)
  - _Leverage: `frontend/src/pages/PatientAssignmentPage.tsx` (290 lines, 100% reuse)_
  - _Requirements: 4.1-4.7_

- [x] 4. Update routes in App.tsx
  - **Modify:** `frontend/src/App.tsx`
  - Remove standalone `/import` route definition
  - Remove standalone `/admin/patient-assignment` route definition
  - Add `/patient-management` route → `PatientManagementPage` (wrapped in `ProtectedRoute allowedRoles={['PHYSICIAN', 'STAFF', 'ADMIN']}`)
  - Add `/patient-management/preview/:previewId` route → `ImportPreviewPage`
  - Add redirect: `/import` → `Navigate to="/patient-management"`
  - Add redirect: `/import/preview/:previewId` → `Navigate to="/patient-management/preview/:previewId"` (preserve params)
  - Add redirect: `/admin/patient-assignment` → `Navigate to="/patient-management?tab=reassign"`
  - _Leverage: `frontend/src/App.tsx` (existing route structure)_
  - _Requirements: 1.7, 2.3, 2.4_

- [x] 5. Update Header nav and AdminPage button
  - **Modify:** `frontend/src/components/layout/Header.tsx`
  - **Modify:** `frontend/src/pages/AdminPage.tsx`
  - **Modify:** `frontend/src/pages/ImportPreviewPage.tsx`
  - Header: Change nav link text "Import" → "Patient Mgmt", path `/import` → `/patient-management`
  - Header: Update active state check from `startsWith('/import')` → `startsWith('/patient-management')`
  - AdminPage: Update "Assign Patients" button to navigate to `/patient-management?tab=reassign`
  - ImportPreviewPage: Update all `navigate('/import')` calls → `navigate('/patient-management')` (3 occurrences)
  - _Leverage: `frontend/src/components/layout/Header.tsx`, `frontend/src/pages/AdminPage.tsx`, `frontend/src/pages/ImportPreviewPage.tsx`_
  - _Requirements: 2.1, 2.2, 2.5, 3.2, 3.3_

- [x] 6. Write Vitest unit tests for PatientManagementPage
  - **Create:** `frontend/src/pages/PatientManagementPage.test.tsx`
  - Test cases:
    - Renders page with "Patient Management" heading
    - Renders "Import Patients" tab by default
    - ADMIN user sees both "Import Patients" and "Reassign Patients" tabs
    - STAFF user sees only "Import Patients" tab
    - PHYSICIAN user sees only "Import Patients" tab
    - Clicking "Reassign Patients" tab updates URL to `?tab=reassign`
    - Clicking "Import Patients" tab removes `?tab` param
    - URL `?tab=reassign` activates Reassign tab for ADMIN
    - URL `?tab=reassign` falls back to Import for non-ADMIN
    - URL `?tab=invalid` falls back to Import
    - Import tab content is visible when Import tab active
    - Reassign tab content is visible when Reassign tab active
  - Mock `useAuthStore` for role testing, use `MemoryRouter` with `initialEntries` for URL params
  - _Leverage: `frontend/src/pages/MainPage.test.tsx` (page test pattern), `frontend/src/pages/ImportPage.test.tsx`_
  - _Requirements: 1.1-1.7, 5.1-5.6_

- [x] 7. Write Playwright E2E tests for navigation and redirects
  - **Create:** `frontend/e2e/patient-management.spec.ts`
  - Test cases:
    - Navigate to `/patient-management` — shows Import tab content
    - Click Reassign tab (as ADMIN) — shows assignment interface, URL updates
    - Navigate to `/import` — redirects to `/patient-management`
    - Navigate to `/admin/patient-assignment` — redirects to `/patient-management?tab=reassign`
    - Header nav shows "Patient Mgmt" with active highlight
    - Non-admin user does not see Reassign tab
  - Use existing Playwright login helpers and page object patterns
  - _Leverage: `frontend/e2e/pages/main-page.ts` (page object pattern), `frontend/e2e/auth.spec.ts` (login helpers)_
  - _Requirements: 2.1-2.4, 1.5-1.6_

- [x] 8. Update existing Cypress tests for new routes
  - **Modify:** `frontend/cypress/e2e/import-flow.cy.ts` — update any hardcoded `/import` URLs to `/patient-management`
  - Run Cypress tests to verify import flow still works via new paths
  - _Leverage: `frontend/cypress/e2e/import-flow.cy.ts`_
  - _Requirements: 2.3, 3.1-3.3_

- [ ] 9. Update project documentation
  - **Modify:** `.claude/CHANGELOG.md` — add entry for Patient Management page
  - **Modify:** `.claude/IMPLEMENTATION_STATUS.md` — update Import section, add Patient Management
  - **Modify:** `.claude/TODO.md` — mark patient-management tasks as complete
  - **Modify:** `.claude/TESTING.md` — add PatientManagementPage test file, update counts
  - **Modify:** `.claude/REGRESSION_TEST_PLAN.md` — add test cases for tab navigation and redirects
  - Run full test suite (`npm test`, `npm run test:run`, `npm run e2e`, `npm run cypress:run`) to verify no regressions
  - _Leverage: existing documentation conventions_
  - _Requirements: 1.1-5.6 (documentation for all requirements)_

## Task Dependencies

```
Task 1 (Page shell) ──┬── Task 2 (Import tab) ──┐
                       └── Task 3 (Reassign tab) ─┤
                                                   ├── Task 4 (Routes)
                                                   │     │
                                                   │     └── Task 5 (Nav + links)
                                                   │
                                                   ├── Task 6 (Vitest)
                                                   ├── Task 7 (Playwright E2E)
                                                   ├── Task 8 (Cypress updates)
                                                   └── Task 9 (Documentation)
```

- Task 1 must complete first (provides the page shell)
- Tasks 2 and 3 can run in parallel (independent tab content)
- Task 4 depends on tasks 1-3 (needs all components to wire routes)
- Task 5 depends on task 4 (navigation links need routes in place)
- Tasks 6, 7, 8 depend on tasks 1-5 (need full implementation to test)
- Tasks 6, 7, 8 can run in parallel (independent test frameworks)
- Task 9 depends on tasks 6-8 (documentation reflects final test counts)
