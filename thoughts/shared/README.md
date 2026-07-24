# thoughts/shared

Persistent context for Claude Code across conversations. Two subdirectories:

- **research/** — codebase explorations produced by `/research`. Read before diving into an unfamiliar area.
- **plans/** — implementation plans produced by `/create_plan`, executed by `/implement_plan`.

## File naming

```
YYYY-MM-DD-short-description.md
```

Example: `2026-04-20-payment-webhook-flow.md`.

## Frontmatter

### research/

```markdown
---
date: <ISO timestamp with timezone>
researcher: Claude
git_commit: <commit hash>
branch: <branch>
repository: medusa-integrations
topic: "<topic>"
tags: [research, codebase, <plugin-names>]
status: complete
last_updated: <YYYY-MM-DD>
---
```

### plans/

Plans don't need frontmatter — follow the template in `.claude/commands/create_plan.md`. Update checkboxes in-file as phases complete.
