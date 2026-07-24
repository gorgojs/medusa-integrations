---
description: Create implementation plans with thorough research
model: opus
---

# Implementation Plan

You are tasked with creating detailed implementation plans through an interactive, iterative process. Be skeptical, thorough, and work collaboratively with the user to produce high-quality technical specs.

## Initial Response

1. **If parameters were provided** (file path or task description):
   - Read any mentioned files FULLY
   - Begin the research process

2. **If no parameters**, respond with:

```
I'll help you create a detailed implementation plan. Please provide:

1. The task description or reference to an existing research doc
2. Any relevant context, constraints, or requirements
3. Which plugin(s) are affected (e.g. medusa-feed-yandex, medusa-payment-tkassa)

Tip: You can invoke with a research doc: `/create_plan thoughts/shared/research/2026-04-20-topic.md`
```

Then wait for input.

## Process Steps

### Step 1: Context Gathering & Initial Analysis

1. **Read mentioned files FULLY** (no limit/offset). Do NOT spawn sub-tasks before reading these yourself.

2. **Spawn initial research tasks in parallel**:
   - **codebase-locator** — find files related to the task
   - **codebase-analyzer** — understand current implementation
   - **codebase-pattern-finder** — find similar existing implementations across plugins

3. **Read all files identified by research tasks** FULLY into main context.

4. **Analyze and verify**:
   - Cross-reference requirements with actual code
   - Note assumptions that need verification
   - Determine true scope based on codebase reality

5. **Present informed understanding and focused questions**:

   ```
   Based on my research, I understand we need to [accurate summary].

   I've found:
   - [Current implementation detail with file:line]
   - [Pattern or constraint discovered]
   - [Potential complexity identified]

   Questions my research couldn't answer:
   - [Technical question requiring human judgment]
   - [Business logic clarification]
   - [Design preference affecting implementation]
   ```

   Only ask what you genuinely cannot answer through code investigation.

### Step 2: Research & Discovery

After initial clarifications:

1. **If the user corrects any misunderstanding**, do NOT just accept it — spawn new research tasks to verify.

2. **Create research todo list** with TodoWrite.

3. **Spawn parallel sub-tasks**:
   - **codebase-locator** — find specific files
   - **codebase-analyzer** — understand details
   - **codebase-pattern-finder** — find similar features to model after

4. **Wait for ALL sub-tasks to complete** before proceeding.

5. **Present findings and design options**:

   ```
   **Current State:**
   - [Key discovery]
   - [Pattern/convention to follow]

   **Design Options:**
   1. [Option A] — [pros/cons]
   2. [Option B] — [pros/cons]

   **Open Questions:**
   - [Technical uncertainty]

   Which approach aligns best?
   ```

### Step 3: Plan Structure Development

Once aligned on approach:

1. **Create plan outline**:

   ```
   ## Overview
   [1-2 sentence summary]

   ## Implementation Phases:
   1. [Phase name] — [what it accomplishes]
   2. [Phase name] — [what it accomplishes]

   Does this phasing make sense?
   ```

2. **Get feedback on structure** before writing details.

### Step 4: Detailed Plan Writing

After structure approval:

1. **Write the plan** to `thoughts/shared/plans/YYYY-MM-DD-description.md`
   - `description` is a brief kebab-case description
   - Example: `2026-04-20-payment-tkassa-recurring.md`

2. **Use this template**:

````markdown
# [Feature/Task Name] Implementation Plan

## Overview

[Brief description of what we're implementing and why]

## Current State Analysis

[What exists now, what's missing, key constraints discovered]

## Desired End State

[Specification of the desired end state and how to verify it]

### Key Discoveries

- [Important finding with file:line reference]
- [Pattern to follow]
- [Constraint to work within]

## What We're NOT Doing

[Explicit out-of-scope items to prevent scope creep]

## Implementation Approach

[High-level strategy and reasoning]

## Phase 1: [Descriptive Name]

### Overview

[What this phase accomplishes]

### Changes Required

#### 1. [Component/File Group]

**File**: `packages/providers/<plugin>/src/...`
**Changes**: [Summary]

```ts
// Specific code to add/modify
```

### Success Criteria

#### Automated Verification

- [ ] Package builds: `yarn workspace @gorgo/<plugin> build`
- [ ] Integration tests pass: `TEST_TYPE=integration:http yarn test` (in the corresponding example)
- [ ] TypeScript checks pass: `tsc --noEmit` inside the package
- [ ] Commit lint passes for the feat/fix commit

#### Manual Verification

- [ ] Feature works in the example app (`examples/<name>/medusa`)
- [ ] Admin UI renders correctly (if applicable)
- [ ] External provider integration verified (e.g., webhook received, payment created)

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to the next phase.

---

## Phase 2: [Descriptive Name]

[Similar structure...]

---

## Testing Strategy

### Unit / Integration Tests

- [What to test]
- [Key edge cases]

### Manual Testing Steps

1. [Specific step]
2. [Verification step]
3. [Edge case to test]

## Migration Notes

[If the plugin has existing users: schema migrations, changeset bump type (patch/minor/major), deprecation notes]

## References

- Related research: `thoughts/shared/research/[relevant].md`
- Similar implementation: `packages/providers/<plugin>/src/...:L`
- Medusa docs / external API spec: [link]
````

### Step 5: Review

1. **Present the draft plan location** and ask for review:
   - Are phases properly scoped?
   - Are success criteria specific enough?
   - Missing edge cases?

2. **Iterate based on feedback** until satisfied.

## Important Guidelines

1. **Be Skeptical** — question vague requirements, verify with code, don't assume.
2. **Be Interactive** — don't write the full plan in one shot; get buy-in at each step.
3. **Be Thorough** — read all context files completely; include specific file:line refs; write measurable success criteria.
4. **Be Practical** — focus on incremental testable changes; consider migration; include "what we're NOT doing".
5. **Track Progress** — use TodoWrite; update as you complete research.
6. **No Open Questions in Final Plan** — if you encounter open questions, STOP and resolve them before finalizing.

## Success Criteria Guidelines

Always separate into two categories:

**Automated Verification** (run by execution agents):
- Build/typecheck: `yarn workspace @gorgo/<plugin> build`
- Tests: `TEST_TYPE=integration:http yarn test`
- Commit-lint compliance

**Manual Verification** (requires human):
- Admin UI functionality
- External provider round-trip (payment, webhook, shipping)
- Edge cases hard to automate

## Common Patterns in this Monorepo

### New plugin feature
1. Add model (`src/modules/<module>/models/`) + migration
2. Extend service with custom methods
3. Define workflow + steps (`src/workflows/`)
4. Add API route + Zod validator (`src/api/admin/...` or `src/api/store/...`)
5. Build admin UI (`src/admin/routes/...` + components)
6. Add i18n keys (`src/admin/i18n/`)
7. Add integration test (`integration-tests/http/`)
8. Update README.md + README.ru.md

### New payment/fulfillment provider method
1. Update abstract base (`src/providers/<provider>/core/*-base.ts`)
2. Add types (`src/providers/<provider>/types/`)
3. Update integration tests
4. Update README

### Medusa version bump
- Coordinate via `scripts/update.sh`
- Update README version badges
- Verify all examples still build + tests pass

## Sub-task Spawning Best Practices

1. Spawn multiple tasks in parallel
2. Each task focused on a specific area
3. Provide detailed instructions with full path context
4. Specify read-only tools
5. Request specific file:line references
6. Wait for all tasks before synthesizing
7. Cross-check findings against the actual codebase
