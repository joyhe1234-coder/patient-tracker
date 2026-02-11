---
allowed-tools: Task
description: Run all 4 test layers and produce a consolidated quality report
---

# JH Test Audit Command (Background Agent)

**IMPORTANT:** Do NOT execute these steps yourself. Launch a background Task agent.

Use the Task tool with:
- `subagent_type`: `"test-orchestrator"`
- `run_in_background`: `true`
- `description`: `"4-layer test audit"`
- `prompt`: the workflow below, with $ARGUMENTS as the feature name (or "none — full audit" if no argument)

Tell the user: "Test audit running in background. I'll notify you when it's done — you can keep working."

---

## Workflow prompt to pass to the background agent:

```
Run all 4 test layers (Jest, Vitest, Playwright, Cypress) and produce a consolidated test report.
Working directory: C:\Users\joyxh\projects\patient-tracker
Feature focus: $ARGUMENTS

Use these commands (with /c/Users/joyxh/projects/patient-tracker paths):

Layer 1 — Backend Jest:
cd /c/Users/joyxh/projects/patient-tracker/backend && npm test

Layer 2 — Frontend Vitest:
cd /c/Users/joyxh/projects/patient-tracker/frontend && npx vitest run

Layer 3 — Playwright E2E:
cd /c/Users/joyxh/projects/patient-tracker/frontend && npm run e2e

Layer 4 — Cypress E2E:
cd /c/Users/joyxh/projects/patient-tracker/frontend && npm run cypress:run

For each layer, capture pass/fail counts. Cross-reference .claude/CHANGELOG.md with .claude/REGRESSION_TEST_PLAN.md for coverage gaps.

Produce the full report with:
- Pass/fail counts per layer
- Any test failures (with error messages)
- Coverage gaps found
- Actionable recommendations

Rules:
- This is a READ-ONLY audit — no tests are written or modified
- All 4 layers run regardless of individual failures
- Report includes actionable recommendations
```
