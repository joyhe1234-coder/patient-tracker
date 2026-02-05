# TDD Workflow Skill

## Description
Enforces Test-Driven Development using isolated subagents. Use this skill when implementing any feature to ensure proper test coverage and code quality.

**Triggers:** "implement", "add feature", "build", "create", "develop"

## Workflow

### Phase 1: RED - Write Failing Test
Use the `tdd-test-writer` agent to:
1. Analyze the requirement
2. Write a failing test
3. Verify the test fails

```
Task: Use agent tdd-test-writer
Prompt: Write failing tests for: [requirement]
```

**Gate:** DO NOT proceed until test failure is confirmed.

### Phase 2: GREEN - Make It Pass
Use the `tdd-implementer` agent to:
1. Read only the test
2. Write minimal code to pass
3. Verify the test passes
4. Run full test suite

```
Task: Use agent tdd-implementer
Prompt: Make this test pass: [test-file-path]
```

**Gate:** DO NOT proceed until all tests pass.

### Phase 3: REFACTOR - Improve Quality
Use the `tdd-refactorer` agent to:
1. Evaluate if refactoring is needed
2. Apply improvements
3. Keep tests green

```
Task: Use agent tdd-refactorer
Prompt: Refactor implementation in: [file-path]
```

**Gate:** All tests must remain green.

## Usage

When user asks to implement a feature:

1. **Clarify requirements** - Create acceptance criteria
2. **For each acceptance criterion:**
   - RED: Write failing test
   - GREEN: Implement minimally
   - REFACTOR: Improve quality
3. **Report completion** with test coverage

## Example

User: "Add a logout button to the header"

**Step 1: Clarify**
```markdown
Acceptance Criteria:
1. Logout button visible when user is logged in
2. Clicking logout clears session and redirects to login
3. Logout button not visible when not logged in
```

**Step 2: TDD Cycle (for criterion 1)**
```
RED:    Write test "should show logout button when logged in"
GREEN:  Add logout button component
REFACTOR: Extract to reusable component if needed
```

**Step 3: Repeat for other criteria**

## Integration with Spec Workflow

When using `/spec-create`:
1. Spec workflow creates requirements.md with acceptance criteria
2. For implementation phase, this TDD skill takes over
3. Each task is implemented using RED-GREEN-REFACTOR

## Output

After completing TDD cycle:
```markdown
## Feature Complete: [feature-name]

### Tests Written:
- [test-file]: [X] test cases

### Implementation:
- [file]: [changes made]

### Test Results:
- All [X] tests passing
- No regressions

### Coverage:
- All acceptance criteria have tests
- Edge cases covered: [list]
```
