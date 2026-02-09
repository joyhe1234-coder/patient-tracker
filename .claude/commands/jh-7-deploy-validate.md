---
allowed-tools: Bash(*), Read, Glob, Grep
description: Pre-deployment GO/NO-GO readiness check
---

# JH Deploy Validate Command

Run a comprehensive pre-deployment validation to determine GO/NO-GO readiness.

## Usage
```
/jh-7-deploy-validate
```

## Workflow

### Step 1: Invoke deployment-validator Agent

Use the Task tool to launch the `deployment-validator` agent:

```
Launch the deployment-validator agent with this prompt:

"Perform pre-deployment validation for the patient-tracker project.
Working directory: {project-root}

Run all checks:
1. Git state (clean tree, correct branch, sync status)
2. Test gate (all 4 layers)
3. Build gate (frontend build, backend type check)
4. Documentation consistency (CHANGELOG vs IMPLEMENTATION_STATUS vs TODO)
5. Environment check (.env.example, secrets)

Produce the GO/NO-GO verdict with full checks table."
```

### Step 2: Present Results

Display the deployment validation report to the user, highlighting:
- **GO/NO-GO verdict**
- Blocking issues (if any)
- Warnings
- Readiness for `/release`

## Rules
- This is a READ-ONLY validation — no files are modified
- Test failure = BLOCKING (no exceptions)
- Build failure = BLOCKING (no exceptions)
- Doc mismatch = WARNING
- Clear GO/NO-GO verdict required
