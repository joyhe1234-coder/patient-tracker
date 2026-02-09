---
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep
description: Spec Create Command — orchestrates requirements → design → tasks using dedicated phase agents
---

# Spec Create Command

Create a new feature specification by orchestrating the 3 phase agents sequentially.

## Usage
```
/spec-create <feature-name> [description]
```

## Workflow

This command is a thin orchestrator that delegates to dedicated phase agents. Each phase requires explicit user approval before proceeding.

### Phase 1: Requirements

1. **Invoke `requirements-planner` agent** via Task tool:
   - Prompt: Create requirements.md for `{feature-name}` with description `{description}`
   - Working directory: project root
2. **Invoke `spec-requirements-validator` agent** to validate the output
3. If validation fails, revise and re-validate
4. Present validated requirements to user
5. **Wait for explicit approval** before proceeding

### Phase 2: Design

1. Verify requirements.md exists and is approved
2. **Invoke `architecture-designer` agent** via Task tool:
   - Prompt: Create design.md for `{feature-name}` using the approved requirements
3. **Invoke `spec-design-validator` agent** to validate the output
4. If validation fails, revise and re-validate
5. Present validated design to user
6. **Wait for explicit approval** before proceeding

### Phase 3: Tasks

1. Verify both requirements.md and design.md exist and are approved
2. **Invoke `task-planner` agent** via Task tool:
   - Prompt: Create tasks.md for `{feature-name}` using approved requirements and design
3. **Invoke `spec-task-validator` agent** to validate the output
4. If validation fails, revise and re-validate
5. Present validated tasks to user
6. **Wait for explicit approval**
7. **Ask**: "Would you like me to generate individual task commands?"
8. If yes: `claude-code-spec-workflow generate-task-commands {feature-name}`

## Rules
- **Sequential phases** — Requirements → Design → Tasks
- **Explicit approval required** between each phase
- **Kebab-case** for feature names
- **Do not skip phases**
- Each phase delegates to its dedicated agent — detailed instructions live in the agent files

## After Completion
- Use `/spec-execute <task-number> {feature-name}` to implement tasks
- Use `/spec-status {feature-name}` to monitor progress
- Restart Claude Code if task commands were generated (for visibility)

### Post-Implementation Quality Gates
After implementation, run these in order:
1. `/jh-4-test-audit {feature-name}` — Run 4-layer test suite + coverage audit
2. `/jh-5-security-audit` — OWASP + dependency security audit
3. `/jh-6-code-review` — 4-dimension code review (bugs, security, compliance, perf)
4. `/jh-7-deploy-validate` — Pre-deployment GO/NO-GO readiness check
5. `/commit` then `/release` — when all gates pass
