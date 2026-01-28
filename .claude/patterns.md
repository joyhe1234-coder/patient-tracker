# Code Patterns & Conventions

## Naming Conventions
- Components: PascalCase (e.g., `PatientCard.tsx`)
- Functions: camelCase (e.g., `getPatientById`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_PATIENTS`)
- Files: [kebab-case or camelCase?]

## Code Style
- [Add linting/formatting tools used]
- [Add any specific style preferences]

## API Patterns
- Endpoint format: [e.g., `/api/v1/resource`]
- Response format: [e.g., `{ data: ..., error: ... }`]
- Error handling: [describe approach]

## Component Patterns
- [State management approach]
- [Component organization]

## Database Patterns
- [ORM/query patterns]
- [Migration approach]

## Testing

**IMPORTANT: All new features MUST include automated tests.**

### Test Frameworks
| Framework | Purpose | Location | Command |
|-----------|---------|----------|---------|
| Jest | Backend unit tests | `backend/src/**/__tests__/*.test.ts` | `cd backend && npm test` |
| Vitest | Frontend components | `frontend/src/**/*.test.tsx` | `cd frontend && npm run test` |
| Playwright | E2E (general UI) | `frontend/e2e/*.spec.ts` | `cd frontend && npm run e2e` |
| Cypress | E2E (AG Grid) | `frontend/cypress/e2e/*.cy.ts` | `cd frontend && npm run cypress:run` |

### When to Use Each
- **Jest**: Backend services, API logic, utilities
- **Vitest**: React component rendering, user interactions, form validation
- **Playwright**: Page navigation, modals, general UI flows
- **Cypress**: AG Grid dropdowns, cell editing, row colors (Playwright struggles with AG Grid)

### Test Patterns
See `.claude/TESTING.md` for detailed patterns and examples.

### Total Test Count: ~220 automated tests
- Backend: 130 (Jest)
- Components: 45 (Vitest)
- Playwright E2E: 25
- Cypress E2E: 19
