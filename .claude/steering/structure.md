# Project Structure & Conventions

## Directory Layout

```
patient-tracker/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Server entry point
│   │   ├── app.ts                # Express app setup
│   │   ├── config/               # Configuration files
│   │   │   ├── database.ts       # Prisma client singleton
│   │   │   ├── index.ts          # Config loader (env vars)
│   │   │   └── import/           # Healthcare system configs (JSON)
│   │   ├── middleware/            # Express middleware
│   │   │   ├── auth.ts           # requireAuth, requireRole, requirePatientDataAccess
│   │   │   ├── upload.ts         # Multer file upload
│   │   │   ├── errorHandler.ts   # Global error handler
│   │   │   └── __tests__/        # Middleware tests
│   │   ├── routes/               # API route handlers
│   │   │   └── __tests__/        # Route integration tests
│   │   ├── services/             # Business logic
│   │   │   ├── import/           # Import pipeline (9 services)
│   │   │   │   └── __tests__/    # Import unit tests
│   │   │   └── __tests__/        # Service unit tests
│   │   ├── types/                # TypeScript interfaces
│   │   └── utils/                # Shared utilities
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   ├── migrations/           # Migration history
│   │   └── seed.ts               # Initial data seeding
│   └── scripts/                  # CLI tools
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Route definitions
│   │   ├── api/                  # API client (Axios)
│   │   ├── components/           # Reusable components
│   │   │   ├── grid/             # AG Grid wrapper
│   │   │   ├── layout/           # Header, Toolbar, StatusBar, StatusFilterBar
│   │   │   ├── modals/           # AddRowModal, ConfirmModal
│   │   │   └── auth/             # ProtectedRoute
│   │   ├── pages/                # Page components
│   │   ├── stores/               # Zustand state stores
│   │   ├── config/               # Frontend configuration
│   │   └── types/                # TypeScript interfaces
│   ├── cypress/                  # Cypress E2E tests
│   │   ├── e2e/                  # Test specs
│   │   ├── fixtures/             # Test data files
│   │   └── support/              # Custom commands
│   └── e2e/                      # Playwright E2E tests
│       └── pages/                # Page Object Models
│
├── docs/                         # Installation guides
├── nginx/                        # Nginx configs
├── scripts/                      # Deployment scripts
└── .claude/                      # AI development tools
    ├── steering/                 # THIS: Product/tech/structure context
    ├── specs/                    # Feature specifications
    ├── agents/                   # TDD subagents
    ├── skills/                   # Test planning skills
    ├── commands/                 # Slash commands
    └── templates/                # Document templates
```

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| React Components | PascalCase | `PatientGrid.tsx`, `AddRowModal.tsx` |
| Pages | PascalCase + Page suffix | `ImportPage.tsx`, `AdminPage.tsx` |
| Services | camelCase | `authService.ts`, `emailService.ts` |
| Routes | kebab-case + .routes | `admin.routes.ts`, `import.routes.ts` |
| Tests | Same name + .test | `authService.test.ts`, `Header.test.tsx` |
| E2E (Playwright) | kebab-case + .spec | `add-row.spec.ts` |
| E2E (Cypress) | kebab-case + .cy | `import-flow.cy.ts` |
| Middleware | camelCase | `auth.ts`, `errorHandler.ts` |
| Config files | camelCase or kebab | `dropdownConfig.ts`, `systems.json` |
| Constants | SCREAMING_SNAKE | `JWT_SECRET`, `SMTP_HOST` |
| Database models | PascalCase | `Patient`, `PatientQualityMeasure` |
| API endpoints | `/api/resource/action` | `/api/import/preview`, `/api/admin/users` |

## Architecture Patterns

### Backend Layers
```
Routes (HTTP handling)
  → Middleware (auth, validation, upload)
    → Services (business logic)
      → Prisma (database access)
```

### Import Pipeline
```
configLoader → fileParser → columnMapper → dataTransformer
  → validator → errorReporter → diffCalculator → previewCache → importExecutor
```

### Frontend Component Hierarchy
```
App.tsx (Routes)
  → ProtectedRoute (Role guard)
    → Page (MainPage, ImportPage, AdminPage)
      → Components (Grid, Toolbar, Modals)
        → AG Grid (Cell renderers, editors)
```

### State Management
- **Zustand** for global state (auth, selected physician)
- **React useState** for local component state
- **AG Grid API** for grid state (row data, column defs)
- No Redux, no Context API for state

## Code Patterns

### Backend Route Handler
```typescript
router.get('/resource', requireAuth, async (req, res, next) => {
  try {
    const result = await serviceFunction();
    res.json({ success: true, data: result });
  } catch (error) {
    next(createError(`Failed: ${(error as Error).message}`, 500));
  }
});
```

### Backend Service Function
```typescript
export async function myServiceFunction(param: string): Promise<Result> {
  // Business logic here
  const data = await prisma.model.findMany({ where: { field: param } });
  return transformedData;
}
```

### Frontend Page Component
```typescript
export default function MyPage() {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-6">
      {loading && <Spinner />}
      {error && <ErrorMessage message={error} />}
      {data && <DataDisplay data={data} />}
    </div>
  );
}
```

### Error Handling
- Backend: `createError(message, statusCode, code?)` → global error handler middleware
- Frontend: try/catch with `setError()` state, Axios interceptors for 401

### Testing Pattern
- **Backend unit:** Jest + mock Prisma + mock services
- **Backend API:** Jest + supertest + mock auth middleware
- **Frontend:** Vitest + React Testing Library + mock stores
- **E2E general:** Playwright + Page Object Model
- **E2E AG Grid:** Cypress + custom commands (`waitForAgGrid`, `selectAgGridDropdown`)

## Git Workflow
1. **develop** branch for all work
2. **feature/** branches for large features
3. **main** branch updated only via `/release`
4. Never commit directly to main
5. Update CHANGELOG.md before every commit

## Documentation Hierarchy
1. **CHANGELOG.md** - Authoritative source of truth (what changed)
2. **IMPLEMENTATION_STATUS.md** - Must match CHANGELOG
3. **TESTING.md** - Test inventory and counts
4. **TODO.md** - Planned work
5. **REGRESSION_TEST_PLAN.md** - Test case tracking
