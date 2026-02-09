---
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep
description: "Phase 3: Create tasks.md for a feature using task-planner agent"
---

# JH Tasks Command

Create tasks.md for an existing feature specification using the dedicated task-planner agent.

## Usage
```
/jh-3-tasks <feature-name>
```

## Prerequisites
- `.claude/specs/{feature-name}/requirements.md` must exist and be approved
- `.claude/specs/{feature-name}/design.md` must exist and be approved

## Workflow

### Step 1: Verify Prerequisites Exist

Check that both `requirements.md` and `design.md` exist in `.claude/specs/{feature-name}/`. If not, tell the user which step to run first.

### Step 2: Invoke task-planner Agent

Use the Task tool to launch the `task-planner` agent:

```
Launch the task-planner agent with this prompt:

"Create tasks.md for the feature '{feature-name}'.
The approved requirements are at .claude/specs/{feature-name}/requirements.md.
The approved design is at .claude/specs/{feature-name}/design.md.
Working directory: {project-root}

Follow your full workflow: load steering context, load templates, load spec context, then create .claude/specs/{feature-name}/tasks.md."
```

### Step 3: Validate with spec-task-validator

After the task-planner agent returns, use the Task tool to launch the `spec-task-validator` agent:

```
Launch the spec-task-validator agent to validate .claude/specs/{feature-name}/tasks.md against requirements and design.
```

### Step 4: Handle Validation Result

- If validation returns **PASS**: Present the tasks to the user
- If validation returns **NEEDS_IMPROVEMENT** or **MAJOR_ISSUES**: Apply the feedback, revise tasks.md, and re-validate

### Step 5: User Approval & Command Generation

Present the validated tasks to the user and ask:

> "Tasks are ready. Do they look good? Would you like me to generate individual task commands for easier execution?"

**If user approves and wants commands:**
```bash
claude-code-spec-workflow generate-task-commands {feature-name}
```

**If user approves without commands:**
> "Tasks approved. Use `/spec-execute <task-number> {feature-name}` to implement individual tasks."

**CRITICAL**: Wait for explicit approval. If user provides feedback, revise and re-validate.

## Rules
- This command creates tasks.md ONLY — no implementation
- Requires approved requirements.md AND design.md
- Always validate before presenting to user
- Ask about task command generation only after approval
