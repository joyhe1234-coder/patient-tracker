---
allowed-tools: Task
description: OWASP top 10 + dependency audit + auth review
---

# JH Security Audit Command (Background Agent)

**IMPORTANT:** Do NOT execute these steps yourself. Launch a background Task agent.

Use the Task tool with:
- `subagent_type`: `"security-auditor"`
- `run_in_background`: `true`
- `description`: `"Security audit"`
- `prompt`: the workflow below, with $ARGUMENTS as the scope (or "full" if no argument)

Tell the user: "Security audit running in background. I'll notify you when it's done — you can keep working."

---

## Workflow prompt to pass to the background agent:

```
Perform a security audit of the codebase.
Working directory: C:\Users\joyxh\projects\patient-tracker
Scope: $ARGUMENTS

Scope options:
- "auth" — Focus on authentication and authorization
- "api" — Focus on API endpoints and input validation
- "frontend" — Focus on frontend security (XSS, CSRF)
- "deps" — Focus on dependency vulnerabilities
- "full" or empty — Full codebase audit

Run these checks:
1. Dependency audit: cd /c/Users/joyxh/projects/patient-tracker/backend && npm audit; cd /c/Users/joyxh/projects/patient-tracker/frontend && npm audit
2. OWASP Top 10 static analysis (read source files for injection, XSS, CSRF, auth issues)
3. Auth & session review (JWT handling, password storage, token expiry)
4. Input validation review (API endpoints, user input sanitization)
5. Environment check (secrets in code, .env handling)

Produce the full findings report with:
- Overall risk rating
- Severity per finding (CRITICAL / HIGH / MEDIUM / LOW)
- File:line references
- Priority remediation steps

Rules:
- READ-ONLY audit — no files are modified
- Secret values are NEVER exposed in the report
- Findings are validated to minimize false positives
```
