---
allowed-tools: Bash(*), Read, Glob, Grep
description: Run all 4 test layers and produce a consolidated quality report
---

# JH Test Audit Command

Run the full 4-layer test suite and produce a consolidated quality report.

## Usage
```
/jh-4-test-audit [feature-name]
```

If `feature-name` is provided, the report will include focused coverage analysis for that feature.

## Workflow

### Step 1: Invoke test-orchestrator Agent

Use the Task tool to launch the `test-orchestrator` agent:

```
Launch the test-orchestrator agent with this prompt:

"Run all 4 test layers (Jest, Vitest, Playwright, Cypress) and produce a consolidated test report.
Working directory: {project-root}
Feature focus: {feature-name or 'none — full audit'}

Run each layer, capture pass/fail counts, cross-reference CHANGELOG with REGRESSION_TEST_PLAN for coverage gaps, and produce the full report."
```

### Step 2: Present Results

Display the test orchestration report to the user, highlighting:
- Any test failures (with error messages)
- Coverage gaps
- Recommendations

## Rules
- This is a READ-ONLY audit — no tests are written or modified
- All 4 layers run regardless of individual failures
- Report includes actionable recommendations
