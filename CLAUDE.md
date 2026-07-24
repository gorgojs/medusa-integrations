# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Repository Structure

This repository is organized as a Yarn v4 monorepo with shared workspaces for plugin packages.

```text
├── examples/
│   ├── 1c/
│   ├── feed-yandex/
│   ├── fulfillment-apiship/
│   ├── payment-robokassa/
│   ├── payment-tkassa/
│   └── payment-yookassa/
├── packages/
│   ├── modules/
│   │   └── integration/
│   ├── providers/
│   │   ├── erp-1c/
│   │   ├── feed-yandex/
│   │   ├── fulfillment-apiship/
│   │   ├── payment-robokassa/
│   │   ├── payment-tkassa/
│   │   └── payment-yookassa/
│   └── utils/
│       └── telemetry/
├── scripts/
└── docs/                            # documentation content (built by gorgo/packages/docs)
    ├── integrations/
    └── tools/
```

> The documentation **site builder** lives in the private `gorgojs/gorgo` repo at `packages/docs`. This repo holds only the docs **content** (MDX); the builder syncs it in at build time.

## Essential Commands

### Monorepo Commands

```bash
yarn install                          # Install all dependencies (triggers husky setup)

 # Update Medusa version across examples
yarn update <version> [example] [-s|--single] [--skip-build]
# e.g.: yarn update 2.14.0 feed-yandex --single --skip-build

# Changesets (versioning & publishing)
yarn changeset                        # Interactively create a changeset
yarn changeset version                # Bump versions and update CHANGELOGs
yarn changeset publish                # Publish packages to npm
```

### Per-Package (Per-Plugin) Commands

Run inside `packages/<name>/`:

```bash
# development
yarn dev                              # Publish locally then start dev watch mode
```

### Per-Example Commands

Run inside `examples/<name>/medusa`:

```bash
yarn install                          # Install all dependencies 
yarn dev                              # Run in development mode
yarn dev:tunnel                       # Run in development mode with tunneling

# testing
yarn test:integration:http            # HTTP integration tests 
yarn test:integration:modules         # Module integration tests
yarn test:unit                        # Unit tests
```

Run inside `examples/<name>/medusa-storefront`:

```bash
yarn install                          # Install all dependencies 
yarn dev                              # Run in development mode
yarn dev:tunnel                       # Run in development mode with tunneling
```

## Commit Conventions

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/) — enforced by commitlint.

**Scope is required** and must be one of:

- Package scope from `packages/modules/` and `packages/providers/` (folder name as-is):
  - `integration`
  - `erp-1c`
  - `feed-yandex`
  - `fulfillment-apiship`
  - `payment-robokassa`
  - `payment-tkassa`
  - `payment-yookassa`
- Package scope from `packages/utils/` (folder name as-is):
  - `telemetry`
- Repo-level:
  - `deps`
  - `release`
  - `docs`
  - `root`

Examples:

```
feat(feed-yandex): add price filter support
fix(payment-robokassa): handle webhook timeout
chore(deps): bump @medusajs/medusa to 2.14.0
```

Scope maps directly to changeset bump type: `feat` → minor, `fix/perf/refactor/docs/revert/test` → patch, breaking (`!`) → major.

## Changelog Generation

`CHANGELOG.md` entries read `<description> by @author in #<pr> (<commit>)` (the `#<pr>` is omitted for direct pushes) and are grouped by **commit type**, not by semver bump (the bump is conveyed by the version number itself). The pipeline:

1. `scripts/generate-changesets.js` turns conventional commits into changesets and stamps each with `commit:` and `author: @<git-author>` (resolved in one GraphQL batch via `scripts/github-authors.js`). The `author:` line makes the credit the **commit author**, not the PR author — `@changesets/changelog-github` otherwise overrides it with the PR author. The description has any trailing ` (#<pr>)` (added by GitHub squash merges) stripped, and the commit body is dropped except a `BREAKING CHANGE:` footer.
2. `changeset version` uses stock `@changesets/changelog-github` (configured in `.changeset/config.json`) to render entries; `scripts/format-changelog.js` (wired into `release:version`) then **reformats** each line to `… by @author in #<pr> (<commit>)` and **regroups** the new version block into sections — Highlights, Breaking Changes, Features, Bug Fixes, …, Chores, Dependencies — deriving the section from each commit's conventional type. It reformats **only the changelogs `changeset version` changed** this release (via `git status`), and within each only the **newest block** — so unreleased packages and any manual edits are left untouched. Idempotent.

> CI pins Node to `24.16.0` in `publish.yml`: Node 24.17+/undici intermittently drops the `@changesets/get-github-info` GraphQL call with `Premature close`, failing `changeset version` (changesets#2115).

Section logic and line reformatting live in `scripts/changelog-utils.js`. A commit lands in **Highlights** if its body contains a `Highlight` trailer (a line that is just `Highlight`). Blocks with no commit link (pre-automation entries) are left untouched. `scripts/rewrite-changelogs.js` is the one-off tool that applied this format to historical changelogs.

## Package Architecture

### Source structure (inside package/<name>/src/)

Not every package uses every directory — include only what the plugin needs.

```
src/
├── admin/          # React admin UI
│   ├── routes/         # UI-routes extending Medusa Admin
│   ├── components/     # shared UI
│       └── /gorgo-widgets      # Components for Gorgo UI-widgets
│   ├── hooks/          # React hooks
│   ├── lib/            # admin-only helpers (e.g. sdk.ts)
│   ├── widgets/        # UI-widgets extending Medusa Admin
│   └── i18n/           # i18next JSON locales
├── api/            # REST route handlers
│   ├── admin/          # authenticated admin endpoints
│   └── {store,hooks}/  # public / webhook endpoints
├── modules/        # Medusa modules
│   └── <name>/
│       ├── index.ts            # Module(<NAME>, { service })
│       ├── service.ts          # extends MedusaService({ Model })
│       ├── models/             # model.define(...)
│       ├── migrations/         # generated migrations
│       └── loaders/            # optional module loaders
├── providers/      # Medusa providers (payment / fulfillment / ...)
│   └── <name>/
│       ├── index.ts            # ModuleProvider(Modules.X, { services })
│       └── service.ts          # extends AbstractXProvider
├── workflows/      # Medusa workflows + steps
│   ├── <name>/
│   │   ├── index.ts            # createWorkflow(...)
│   │   └── steps/              # createStep(...)
│   └── index.ts                # barrel re-export
├── gorgo-widgets/  # Gorgo UI-widgets extending Gorgo plugins
├── jobs/           # scheduled background jobs
├── lib/            # cross-cutting libraries used by the package
├── utils/          # small utility helpers
├── data/           # static data / fixtures / seed files
└── types/          # shared TypeScript types (barrel via index.ts)
```

### TypeScript

All packages target ES2021, Module Node16, with SWC for ts-node. Build output includes both `.js` (CJS) and `.mjs` (ESM) for the admin bundle.

## MCP

Use the **medusa** MCP (`docs.medusajs.com`) for Medusa v2 APIs and patterns, and **context7** (shipped in `.mcp.json`) for third-party SDK docs — prefer both over memory.

## CI/CD

| Workflow | Trigger | Purpose |
|---|---|---|
| `publish.yml` | Push to main (packages/**) | Auto-generate changesets → version → publish to npm |
| `update-medusa-version.yml` | Daily 6 AM + manual | Check latest Medusa, run integration tests, open update PR |
| `notify-deploy-docs.yml` | Push to main (docs/**) | Notify automation repo (`gorgo-docs-updated`) to rebuild & deploy docs |

## Workflow: Research → Plan → Implement

Three slash commands drive non-trivial work, each writing outputs to `thoughts/shared/`:

- **`/research`** — spawn parallel agents to document how existing code works. Output: `thoughts/shared/research/YYYY-MM-DD-topic.md`.
- **`/create_plan`** — interactive planning with phased implementation, automated + manual verification criteria. Output: `thoughts/shared/plans/YYYY-MM-DD-topic.md`.
- **`/implement_plan`** — execute an approved plan phase by phase, checking off items and pausing for manual verification.

Read existing docs in `thoughts/shared/` before re-exploring the same area. See `thoughts/shared/README.md` for conventions.

### Sub-agents

Four specialized read-only agents live in `.claude/agents/`:

- **codebase-locator** — WHERE files live (Grep/Glob/LS)
- **codebase-analyzer** — HOW code works (Read + search)
- **codebase-pattern-finder** — existing examples to model after
- **web-search-researcher** — external docs (Medusa v2, third-party SDKs)

Run them in parallel when investigating independent areas. See `.claude/agents/README.md`.

## Examples

Each `examples/<name>/` contains a standalone Medusa project with the plugin pre-installed. They serve as integration test environments — the CI `update-medusa-version.yml` workflow runs `update.sh` against them. When developing a plugin, link it locally using `yalc` (`.yalc/` is gitignored).
