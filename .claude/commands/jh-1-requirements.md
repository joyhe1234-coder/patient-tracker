---
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep
description: "Phase 1: Create requirements.md for a feature using requirements-planner agent"
---

# JH Requirements Command

Create requirements.md for a new feature using the dedicated requirements-planner agent.

## Usage
```
/jh-1-requirements <feature-name> [description]
```

## Workflow

### Step 1: Invoke requirements-planner Agent

Use the Task tool to launch the `requirements-planner` agent:

```
Launch the requirements-planner agent with this prompt:

"Create requirements.md for the feature '{feature-name}'.
Description: {description}
Working directory: {project-root}

Follow your full workflow: load steering context, load templates, analyze codebase, then create .claude/specs/{feature-name}/requirements.md."
```

### Step 2: Validate with spec-requirements-validator

After the requirements-planner agent returns, use the Task tool to launch the `spec-requirements-validator` agent:

```
Launch the spec-requirements-validator agent to validate .claude/specs/{feature-name}/requirements.md.
```

### Step 3: Handle Validation Result

- If validation returns **PASS**: Present the requirements to the user
- If validation returns **NEEDS_IMPROVEMENT** or **MAJOR_ISSUES**: Apply the feedback, revise requirements.md, and re-validate

### Step 4: User Approval

Present the validated requirements to the user and ask:

> "Requirements are ready. Do they look good? If so, run `/jh-2-design {feature-name}` to proceed to the design phase."

**CRITICAL**: Wait for explicit approval. If user provides feedback, revise and re-validate.

## Rules
- This command creates requirements.md ONLY — no design or tasks
- Feature names must be kebab-case
- Always validate before presenting to user
- Never proceed to design without explicit user approval
