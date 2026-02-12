---
allowed-tools: Task, Read, Glob, Grep, Write, Edit, TaskCreate, TaskUpdate, TaskList
description: Comprehensive code quality scan — duplicates, maintainability, DB queries, types, and more
---

# Code Quality Scan Command

**IMPORTANT:** Do NOT run all scans yourself. Launch 4 parallel Explore agents to scan different dimensions, then compile findings into `.claude/CODE_QUALITY_REPORT.md`.

Tell the user: "Code quality scan running — 4 parallel scans. I'll compile the report when all complete."

## Arguments

`$ARGUMENTS` can be:
- empty — Full scan (all dimensions)
- `duplicates` — Phase 1 only
- `db` — Phase 2 only (database/queries)
- `maintainability` — Phase 3 only
- `errors` — Phase 4 only (error handling & async)
- `types` — Phase 5 only (TypeScript strictness)
- `logging` — Phase 6 only
- `css` — Phase 7 only
- `security` — Phase 8 only
- `perf` — Phase 9 only
- `tests` — Phase 10 only

---

## Scan Dimensions

Launch these as parallel Task agents (subagent_type: "Explore", thoroughness: "very thorough"). If `$ARGUMENTS` specifies a single dimension, only launch that one. If empty, launch all 4 groups.

### Agent 1: Duplicate Code Scan

```
Thoroughly scan C:\Users\joyxh\projects\patient-tracker for duplicated logic:

1. FRONTEND DUPLICATES — Look in frontend/src/ for:
   - Identical or near-identical functions across files (especially date formatting, validation, parsing)
   - Constants/arrays redefined inline multiple times (status arrays, color maps, field names)
   - Copy-pasted CSS patterns in frontend/src/index.css
   - Similar component structures that could share a base
   - Repeated AG Grid column definition patterns

2. BACKEND DUPLICATES — Look in backend/src/ for:
   - Repeated Prisma query patterns across services and routes
   - Similar route handler structures (auth checks, error handling, response formatting)
   - Duplicated validation logic between routes and services
   - Business logic reimplemented in routes instead of calling existing service functions

3. CROSS-CUTTING DUPLICATES:
   - Types/interfaces defined in both frontend and backend
   - Constants duplicated across frontend and backend (status values, field names)
   - Similar utility functions in different locations

4. TEST DUPLICATES:
   - Repeated mock creation patterns across test files
   - Similar test setup/teardown that could be shared factories

For each duplicate found, report:
- File paths and line numbers
- Brief code snippets showing the duplication
- Severity: HIGH (exact copy-paste), MEDIUM (similar pattern), LOW (conceptual duplicate)
- Suggested consolidation approach
```

### Agent 2: Maintainability + General Quality Scan

```
Review C:\Users\joyxh\projects\patient-tracker for maintainability and general quality:

MAINTAINABILITY:
1. LARGE FILES — Find all files over 200 lines. Report line count and what should be split.
2. DEEP NESTING — Find functions with 3+ levels of nesting. Report file, function, depth.
3. UNCLEAR NAMING — Variables/functions with ambiguous names (single letters, generic "data"/"result").
4. TIGHT COUPLING — Components importing 3+ local modules, circular deps, business logic in UI.
5. FILE ORGANIZATION — Orphaned files, inconsistent directory structure.

GENERAL QUALITY:
1. UNUSED CODE — Exported functions never imported, dead code, commented-out blocks, unused CSS classes.
2. INCONSISTENT PATTERNS — Mixed async/await vs .then(), inconsistent error handling, naming conventions.
3. ANTI-PATTERNS — useEffect with missing dependencies, inline styles that should be CSS, console.log in production code.
4. SETTIMEOUT WITHOUT CLEANUP — setTimeout in React components without clearing on unmount.
5. MAGIC STRINGS/NUMBERS — Hardcoded values that should be constants or enums.

For each finding: file path, line numbers, severity (HIGH/MEDIUM/LOW), concrete fix suggestion.
```

### Agent 3: TypeScript + Error Handling Scan

```
Review C:\Users\joyxh\projects\patient-tracker for type safety and error handling:

TYPESCRIPT STRICTNESS:
1. ANY USAGE — Find all `: any`, `as any`, `Record<string, any>` in non-test source files. Count occurrences per file.
2. MISSING RETURN TYPES — Exported functions without explicit return type annotations.
3. WEAK TYPES — `Record<string, unknown>`, untyped function parameters, loose union types.
4. TYPE ASSERTIONS — `as` casts that bypass type checking (especially in non-test code).
5. MISSING DISCRIMINATED UNIONS — Places where string literals are used that could be typed unions.

ERROR HANDLING:
1. MISSING TRY/CATCH — API calls, database operations, file I/O without error handling.
2. UNHANDLED PROMISES — Async functions called without await or .catch().
3. SILENT ERROR SWALLOWING — catch blocks that only console.log without user feedback.
4. INCONSISTENT ERROR PATTERNS — Some services throw, others return null, others use Result types.
5. MISSING NULL CHECKS — Optional chaining candidates, potential undefined access.

For each finding: file path, line numbers, severity, concrete fix with code example.
```

### Agent 4: Database + Performance + Security Scan

```
Review C:\Users\joyxh\projects\patient-tracker for database quality, performance, and security:

DATABASE (backend/src/ and backend/prisma/):
1. N+1 QUERIES — Loops with individual DB calls that should be batched.
2. MISSING INDEXES — Schema fields used in WHERE/ORDER BY/GROUP BY without indexes. Check compound queries.
3. REPEATED QUERY PATTERNS — Similar Prisma calls that should be extracted into reusable service functions.
4. RAW QUERIES — Any $queryRaw/$executeRaw that could use Prisma query builder.
5. TRANSACTION SAFETY — Multi-step operations that should be wrapped in $transaction but aren't.
6. DATA VALIDATION — Database writes without input validation, missing unique constraints.

PERFORMANCE:
1. UNNECESSARY RE-RENDERS — React components re-rendering when they shouldn't.
2. MISSING MEMOIZATION — Expensive computations in render without useMemo/useCallback.
3. LARGE PAYLOADS — API endpoints returning more data than needed (missing select/include).
4. BUNDLE SIZE — Large imports that could be tree-shaken or lazy-loaded.

SECURITY:
1. INPUT SANITIZATION — User input accepted without validation or sanitization.
2. SENSITIVE DATA EXPOSURE — Auth tokens, passwords, or PII in logs or error messages.
3. DEPENDENCY VULNERABILITIES — Check package.json for known vulnerable packages.
4. AUTH BYPASS — Routes missing auth middleware, privilege escalation paths.

For each finding: file path, line numbers, severity (CRITICAL/HIGH/MEDIUM/LOW), fix suggestion.
```

---

## Compilation Step

After all agents complete, compile findings into a single report:

1. Read all agent outputs
2. Deduplicate overlapping findings
3. Create/update `C:\Users\joyxh\projects\patient-tracker\.claude\CODE_QUALITY_REPORT.md` with:

```markdown
# Code Quality Report
> Generated: [date]
> Scope: [full / specific dimension]

## Summary Scorecard
| Dimension | Status | Critical | High | Medium | Low |
|-----------|--------|----------|------|--------|-----|

## Critical Findings (fix immediately)
## High Priority Findings
## Medium Priority Findings
## Low Priority Findings

## Recommended Execution Order
(Reference phases from CODE_QUALITY_PLAN.md)
```

4. Cross-reference findings against `.claude/CODE_QUALITY_PLAN.md` — update the plan if new issues found
5. Present summary to user with top 5 actionable items
