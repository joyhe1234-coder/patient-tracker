---
allowed-tools: Task
description: 4-dimension code review (bugs, security, compliance, performance)
---

# JH Code Review Command (Background Agent)

**IMPORTANT:** Do NOT execute these steps yourself. Launch a background Task agent.

Use the Task tool with:
- `subagent_type`: `"code-reviewer"`
- `run_in_background`: `true`
- `description`: `"4-dimension code review"`
- `prompt`: the workflow below, with $ARGUMENTS as the diff source

Tell the user: "Code review running in background. I'll notify you when it's done — you can keep working."

---

## Workflow prompt to pass to the background agent:

```
Perform a 4-dimension code review.
Working directory: C:\Users\joyxh\projects\patient-tracker
Diff source: $ARGUMENTS

Diff source options:
- "staged" — Review only staged changes (git diff --staged)
- "<branch-name>" — Review changes between branch and HEAD (git diff <branch>...HEAD)
- empty/no argument — Review all uncommitted changes (git diff)

Review across all 4 dimensions:
1. Bugs & Correctness — logic errors, off-by-one, null handling, race conditions
2. Logic & Security — injection, auth bypass, data exposure, OWASP issues
3. CLAUDE.md Compliance — read C:\Users\joyxh\projects\patient-tracker\CLAUDE.md and verify changes follow project conventions
4. Performance — N+1 queries, unnecessary re-renders, memory leaks, large payloads

For each finding:
- Validate by reading surrounding context (no false positives)
- Include file:line reference
- Rate severity (CRITICAL / HIGH / MEDIUM / LOW)

Produce the full review report with:
- Verdict: APPROVE / REQUEST_CHANGES / COMMENT
- Findings table with severity, dimension, description, file:line
- CLAUDE.md compliance status

Rules:
- READ-ONLY review — no files are modified
- HIGH SIGNAL ONLY — no style nitpicks
- Every finding validated against surrounding context
```
