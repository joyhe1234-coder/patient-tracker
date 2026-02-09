---
allowed-tools: Bash(git:*), Read, Glob, Grep
description: 4-dimension code review (bugs, security, compliance, performance)
---

# JH Code Review Command

Perform a rigorous 4-dimension code review of current changes.

## Usage
```
/jh-6-code-review [branch]
```

**Options:**
- `staged` — Review only staged changes (`git diff --staged`)
- `<branch-name>` — Review changes between branch and HEAD (`git diff <branch>...HEAD`)
- (no argument) — Review all uncommitted changes (`git diff`)

## Workflow

### Step 1: Invoke code-reviewer Agent

Use the Task tool to launch the `code-reviewer` agent:

```
Launch the code-reviewer agent with this prompt:

"Perform a 4-dimension code review.
Working directory: {project-root}
Diff source: {branch or 'staged' or 'all uncommitted'}

Review across all 4 dimensions:
1. Bugs & Correctness
2. Logic & Security
3. CLAUDE.md Compliance
4. Performance

Validate each finding by reading surrounding context. Produce the full review report with verdict."
```

### Step 2: Present Results

Display the code review report to the user, highlighting:
- Verdict (APPROVE / REQUEST_CHANGES / COMMENT)
- Critical findings
- CLAUDE.md compliance status
- Suggestions for improvement

## Rules
- This is a READ-ONLY review — no files are modified
- HIGH SIGNAL ONLY — no style nitpicks
- Every finding is validated against surrounding context
- Includes file:line references
