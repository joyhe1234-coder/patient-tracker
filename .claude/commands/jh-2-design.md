---
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep
description: "Phase 2: Create design.md for a feature using architecture-designer agent"
---

# JH Design Command

Create design.md for an existing feature specification using the dedicated architecture-designer agent.

## Usage
```
/jh-2-design <feature-name>
```

## Prerequisites
- `.claude/specs/{feature-name}/requirements.md` must exist and be approved

## Workflow

### Step 1: Verify Requirements Exist

Check that `.claude/specs/{feature-name}/requirements.md` exists. If not, tell the user to run `/jh-1-requirements {feature-name}` first.

### Step 2: Invoke architecture-designer Agent

Use the Task tool to launch the `architecture-designer` agent:

```
Launch the architecture-designer agent with this prompt:

"Create design.md for the feature '{feature-name}'.
The approved requirements are at .claude/specs/{feature-name}/requirements.md.
Working directory: {project-root}

Follow your full workflow: load steering context, load templates, load requirements, research codebase, then create .claude/specs/{feature-name}/design.md."
```

### Step 3: Validate with spec-design-validator

After the architecture-designer agent returns, use the Task tool to launch the `spec-design-validator` agent:

```
Launch the spec-design-validator agent to validate .claude/specs/{feature-name}/design.md against the requirements.
```

### Step 4: Handle Validation Result

- If validation returns **PASS**: Present the design to the user
- If validation returns **NEEDS_IMPROVEMENT** or **MAJOR_ISSUES**: Apply the feedback, revise design.md, and re-validate

### Step 5: User Approval

Present the validated design to the user and ask:

> "Design is ready. Does it look good? If so, run `/jh-3-tasks {feature-name}` to proceed to task planning."

**CRITICAL**: Wait for explicit approval. If user provides feedback, revise and re-validate.

## Rules
- This command creates design.md ONLY — no tasks
- Requires approved requirements.md
- Always validate before presenting to user
- Never proceed to tasks without explicit user approval
