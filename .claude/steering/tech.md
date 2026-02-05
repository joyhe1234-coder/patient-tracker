# Technology Stack

## Backend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 20 LTS | Server runtime |
| Framework | Express.js | ^4.21.0 | HTTP server |
| Language | TypeScript | ^5.4.5 | Type safety |
| ORM | Prisma | ^5.22.0 | Database access |
| Database | PostgreSQL | 16-alpine | Data storage |
| Auth | JWT (jsonwebtoken) | ^9.0.2 | Token authentication |
| Hashing | bcryptjs | ^2.4.3 | Password hashing |
| Upload | Multer | ^2.0.2 | File upload handling |
| CSV | Papa Parse | ^5.4.1 | CSV parsing |
| Excel | XLSX (SheetJS) | ^0.18.5 | Excel parsing |
| Email | Nodemailer | ^7.0.13 | SMTP email |
| Security | Helmet, CORS | ^7.1.0, ^2.8.5 | HTTP headers, CORS |

### Backend Build
- **Build:** `tsc && node scripts/copyConfig.js` (TypeScript compile + copy JSON configs)
- **Output:** `dist/` directory
- **Module:** ESM (`"type": "module"`)
- **Target:** ES2022
- **Config files:** JSON configs copied from `src/config/` to `dist/config/`

## Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Framework | React | ^18.3.1 | UI library |
| Build | Vite | ^5.2.11 | Build tool |
| Language | TypeScript | ^5.4.5 | Type safety |
| Routing | React Router | ^6.23.0 | Client routing |
| State | Zustand | ^4.5.2 | Global state |
| Grid | AG Grid Community | ^31.0.0 | Data grid |
| HTTP | Axios | ^1.7.0 | API client |
| CSS | Tailwind CSS | ^3.4.3 | Utility CSS |
| Icons | Lucide React | ^0.376.0 | Icon library |

### Frontend Build
- **Build:** `vite build`
- **Output:** `dist/` directory
- **Module:** ESM
- **Target:** ES2020

## Testing

| Framework | Purpose | Count | Location | Command |
|-----------|---------|-------|----------|---------|
| Jest | Backend unit + API | 426 | `backend/src/**/__tests__/` | `cd backend && npm test` |
| Vitest | Frontend components | 203 | `frontend/src/**/*.test.tsx` | `cd frontend && npm run test:run` |
| Playwright | E2E (general UI) | 35 | `frontend/e2e/` | `cd frontend && npm run e2e` |
| Cypress | E2E (AG Grid) | 205 | `frontend/cypress/e2e/` | `cd frontend && npm run cypress:run` |

### Testing Notes
- Jest uses ESM with `--experimental-vm-modules`
- ESM mocking limitations: route tests can only test auth (401), not full authenticated flows
- Cypress required for AG Grid dropdowns (Playwright can't commit selections)
- Vitest uses jsdom environment with React Testing Library

## Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Container | Docker | Application packaging |
| Orchestration | Docker Compose v3.8 | Service management |
| Reverse Proxy | Nginx (Alpine) | Route frontend + API |
| CI/CD | GitHub Actions | Automated tests |
| Cloud | Render.com | Production hosting |

### Docker Architecture
```
Nginx (port 80) → Backend (port 3000) → PostgreSQL (port 5432)
```
- Frontend built and served by backend container (not separate container)
- Nginx reverse proxies `/api/*` to backend, serves static files

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | 64-char random string |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | development |
| `PORT` | Backend port | 3000 |
| `APP_URL` | Public URL for emails | http://localhost |
| `SMTP_HOST` | SMTP server | (none) |
| `SMTP_PORT` | SMTP port | 587 |
| `SMTP_USER` | SMTP username | (none) |
| `SMTP_PASS` | SMTP password | (none) |
| `SMTP_FROM` | From address | (none) |

## Technical Constraints
- AG Grid Community edition (no enterprise features)
- No pagination yet (grid shows all rows)
- Preview cache in-memory (lost on restart, 30-min TTL)
- Single database (no read replicas)
- No Redis (all state in PostgreSQL + memory)

## Third-Party Integrations
- **Hill Healthcare:** CSV import configuration (column mapping)
- **SMTP:** Password reset and admin notification emails
- **Render.com:** Production deployment (auto-deploy from main branch)
