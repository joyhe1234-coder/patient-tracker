---
allowed-tools: Task
description: Pre-deployment GO/NO-GO readiness check
---

# JH Deploy Validate Command (Background Agent)

**IMPORTANT:** Do NOT execute these steps yourself. Launch a background Task agent.

Use the Task tool with:
- `subagent_type`: `"deployment-validator"`
- `run_in_background`: `true`
- `description`: `"Pre-deploy GO/NO-GO check"`
- `prompt`: the workflow below

Tell the user: "Deploy validation running in background. I'll notify you when it's done — you can keep working."

---

## Workflow prompt to pass to the background agent:

```
Perform pre-deployment validation for the patient-tracker project.
Working directory: C:\Users\joyxh\projects\patient-tracker

Run ALL checks (use /c/Users/joyxh/projects/patient-tracker paths for bash):

1. Git state:
   - git status (clean working tree?)
   - git branch --show-current (on develop?)
   - git log origin/develop..HEAD (anything unpushed?)

2. Test gate (all 4 layers — ALL must pass):
   - cd /c/Users/joyxh/projects/patient-tracker/backend && npm test
   - cd /c/Users/joyxh/projects/patient-tracker/frontend && npx vitest run
   - cd /c/Users/joyxh/projects/patient-tracker/frontend && npm run e2e
   - cd /c/Users/joyxh/projects/patient-tracker/frontend && npm run cypress:run

3. Build gate:
   - cd /c/Users/joyxh/projects/patient-tracker/frontend && npm run build
   - cd /c/Users/joyxh/projects/patient-tracker/backend && npx tsc --noEmit

4. Documentation consistency:
   - Read .claude/CHANGELOG.md, .claude/IMPLEMENTATION_STATUS.md, .claude/TODO.md
   - Cross-check for contradictions or missing items

5. Environment check:
   - Verify .env.example exists and is up to date
   - Check no secrets are committed in source

Produce the GO/NO-GO verdict with:
- Checks table (CHECK | STATUS | DETAILS)
- Blocking issues (if any)
- Warnings
- Final verdict: GO or NO-GO
- If GO: "Ready for /release"
- If NO-GO: list what must be fixed first

Rules:
- READ-ONLY validation — no files are modified
- Test failure = BLOCKING (no exceptions)
- Build failure = BLOCKING (no exceptions)
- Doc mismatch = WARNING
- Clear GO/NO-GO verdict required
```
