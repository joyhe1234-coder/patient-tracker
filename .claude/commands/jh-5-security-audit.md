---
allowed-tools: Bash(*), Read, Glob, Grep
description: OWASP top 10 + dependency audit + auth review
---

# JH Security Audit Command

Perform a comprehensive security audit of the codebase.

## Usage
```
/jh-5-security-audit [scope]
```

**Scope options:**
- `auth` — Focus on authentication and authorization
- `api` — Focus on API endpoints and input validation
- `frontend` — Focus on frontend security (XSS, CSRF)
- `deps` — Focus on dependency vulnerabilities
- (no scope) — Full codebase audit

## Workflow

### Step 1: Invoke security-auditor Agent

Use the Task tool to launch the `security-auditor` agent:

```
Launch the security-auditor agent with this prompt:

"Perform a security audit of the codebase.
Working directory: {project-root}
Scope: {scope or 'full'}

Run dependency audit, OWASP Top 10 static analysis, auth & session review, input validation review, and environment check. Produce the full findings report with severity ratings."
```

### Step 2: Present Results

Display the security audit report to the user, highlighting:
- Overall risk rating
- Critical and high-severity findings
- Dependency vulnerabilities
- Priority remediation steps

## Rules
- This is a READ-ONLY audit — no files are modified
- Secret values are NEVER exposed in the report
- All findings include file:line references
- Findings are validated to minimize false positives
