# AGENTS.md

## Overview

A production-ready Medusa starter for direct-to-consumer commerce, published by Gorgo as a fork of
the official [medusajs/dtc-starter](https://github.com/medusajs/dtc-starter). The repository is a
pnpm workspace holding two apps, a Medusa 2 backend (`@dtc/gorgo-medusa-backend`) and a Next.js 15
storefront (`@dtc/gorgo-medusa-storefront`). Both ship in every clone, unlike upstream where the
storefront is optional.

People install this repository as a template through `create-medusa-app --repo-url`, so treat every
file as something a shop owner will read and then edit. The demo catalog, the placeholder copy and
the `supersecret` defaults are all deliberate.

## Where the Documentation Lives

The READMEs are the reference for installation, environment variables, commands and deployment. Read
them before answering a question about any of those, and update them when you change what they
describe.

- [README.md](README.md) covers the repository, its features and the full getting-started walkthrough
- [apps/backend/README.md](apps/backend/README.md) covers backend commands and every backend variable
- [apps/storefront/README.md](apps/storefront/README.md) covers storefront commands and every
  storefront variable

Long-form guides live at
[docs.gorgojs.com/tools/medusa-dtc-starter](https://docs.gorgojs.com/tools/medusa-dtc-starter) and
are written in the `gorgojs/medusa-integrations` repository, not here.

## Directory Structure

```text
.
├── apps/
│   ├── backend/                      # Medusa application, Admin and transactional emails
│   │   ├── medusa-config.ts          # modules, plugins, feature flags, all env-driven
│   │   ├── eslint.config.mjs         # read by medusa lint, develop and build
│   │   ├── jest.config.js            # suites split by TEST_TYPE
│   │   ├── integration-tests/        # setup.js, referenced by jest.config.js setupFiles
│   │   ├── scripts/                  # copy-migration-data.js, runs after medusa build
│   │   └── src/
│   │       ├── admin/                # scaffold for Admin extensions and their i18n
│   │       ├── api/                  # custom store and admin routes, file-based
│   │       ├── emails/               # React Email templates, their i18n (36 locales) and lib/
│   │       │                         # lib/styles.ts is the one style sheet for all of them
│   │       ├── jobs/                 # scheduled jobs
│   │       ├── links/                # module links
│   │       ├── migration-scripts/    # initial-data-seed.ts, its stages under lib/, JSON under data/
│   │       ├── modules/              # smtp-notification provider
│   │       ├── subscribers/          # transactional emails and storefront revalidation
│   │       └── workflows/            # workflows and steps
│   └── storefront/                   # Next.js 15 storefront on the App Router
│       ├── messages/                 # 36 next-intl UI catalogs
│       ├── next.config.js            # standalone output, next-intl plugin, image hosts
│       ├── tailwind.config.js        # Medusa UI preset plus a hand-kept content allowlist
│       ├── public/flags/             # vendored country flags
│       └── src/
│           ├── app/                  # [locale] routes, api/, llms.txt, sitemap, robots
│           ├── i18n/                 # locale list, routing, request config, navigation
│           ├── lib/                  # data loaders, constants, hooks, utils, geolocation
│           ├── middleware.ts         # locale and region resolution
│           ├── modules/              # feature areas: store, products, cart, checkout, account…
│           └── styles/globals.css    # Tailwind entry and the few global overrides
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

The Medusa convention directories (`admin`, `api`, `jobs`, `links`, `modules`, `subscribers`,
`workflows`) each keep a `README.md` from the framework describing the primitive they hold. Read the
local one before adding a file there. `emails` and `migration-scripts` are this starter's own and
carry no such README.

Those seven names belong to Medusa's loaders, and `subscribers` is walked recursively. Every `.ts`
file under it is imported at boot and validated as a subscriber, so a helper parked anywhere inside
warns on every start. Code that is not one of the seven primitives belongs in a sibling directory of
its own, the way `emails` and `migration-scripts` already do.

## Package Manager

pnpm 10.11.1, pinned by `packageManager` in the root [package.json](package.json). Node 20.19 or
later, or 22.12 or later. `engines` excludes v21.

When the pnpm on `PATH` is a different major, run `corepack pnpm <command>`. A mismatched major asks
to delete and reinstall every `node_modules` in the workspace.

The starter is meant to install under npm and yarn as well, so never put a pnpm-only construct into a
package script, and never add a second lockfile.

## Commands

Run these from the repository root.

| Command | What it does |
|---|---|
| `pnpm dev` | Start both apps |
| `pnpm backend:dev` | Backend only, on `http://localhost:9000`, Admin at `/app` |
| `pnpm storefront:dev` | Storefront only, on `http://localhost:8000` |
| `pnpm backend:seed` | Seed the store, 241 regions, 36 locales and the demo catalog |
| `pnpm build` | Build both apps |
| `pnpm lint` | Lint both apps |

Two of these come with a catch. `pnpm lint` covers both apps, `medusa lint` in the backend and
`next lint` in the storefront, and the storefront half loads `next.config.js` and exits when
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is absent from the environment. `pnpm test` executes nothing at
all, because neither app defines a `test` task. The backend suites are `test:unit`,
`test:integration:http` and `test:integration:modules`, run from `apps/backend` against a live
Postgres.

## Verifying Your Work

The storefront typechecks and lints clean, and `next build` enforces both. Keep it that way, because
a single new finding now fails the build rather than joining a backlog.

```bash
cd apps/storefront
npx tsc --noEmit    # types
npx next lint       # lint
npx next build      # runs both, then builds
```

[next.config.js](apps/storefront/next.config.js) used to carry `typescript.ignoreBuildErrors` and
`eslint.ignoreDuringBuilds`. Both are gone. Do not add them back to get a change through, and do not
reach for `eslint-disable` where the finding is real. The repository has seven deliberate
`react-hooks/exhaustive-deps` suppressions, each on an effect whose dependency list is intentionally
narrow. A new one needs the same kind of reason written next to it.

The backend lints clean too, through `medusa lint` and
[eslint.config.mjs](apps/backend/eslint.config.mjs). Mind that `medusa develop` runs the same check
before it starts and refuses to boot on a lint error, so a lint mistake there breaks `pnpm dev` and
not just CI. `medusa build` runs it as well, but only reports and carries on.

```bash
cd apps/backend
npx medusa lint    # or npx medusa lint --fix
npx tsc --noEmit   # types
```

## Conventions

### Formatting Differs Between the Two Apps

The storefront runs Prettier with `semi: false`
([.prettierrc.json](apps/storefront/.prettierrc.json)). The backend keeps semicolons and has no
Prettier config of its own. Match the file you are editing instead of reformatting it. There is no
repo-wide formatter and no formatting gate, so a reformatting sweep is pure noise in a diff.

Lint rules for the storefront live in [.eslintrc.json](apps/storefront/.eslintrc.json), extending
`next/core-web-vitals` and `next/typescript`. A binding that is unused on purpose takes a leading
underscore.

### Storefront

- Server components by default. Reach for `"use client"` only when you need state, effects, browser
  APIs or Framer Motion.
- Data loaders belong in [src/lib/data](apps/storefront/src/lib/data), as `"use server"` modules
  calling the `sdk` from [lib/config.ts](apps/storefront/src/lib/config.ts). Put a new fetch there
  rather than in a component.
- Import through the `@lib/*`, `@modules/*` and `@i18n/*` aliases from
  [tsconfig.json](apps/storefront/tsconfig.json).
- Kebab-case directory names under `src/modules`, with the component itself as `index.tsx`.
- Never hardcode a user-facing string. See Localization below.

### Backend

- Medusa resolves subscribers, jobs, links, modules and API routes from the filesystem, so a new file
  in the right directory registers itself.
- [medusa-config.ts](apps/backend/medusa-config.ts) turns optional infrastructure on from the
  environment. Redis, SMTP and S3 each activate from their own variables, and development stays in
  memory unless you set `USE_REDIS=true`. Keep anything new to that shape rather than making it
  mandatory for a first run.
- The Integration Module is registered with an empty `providers` array on purpose, so a shop owner
  can add a provider without editing config. Leave the array empty.

## Localization

36 storefront locales, declared once in [src/i18n/config.ts](apps/storefront/src/i18n/config.ts).
`ar` and `he` are right-to-left, and `rtlLocales` in that file is what every direction-aware consumer
reads.

Three sets of catalogs have to stay in step, each holding one file per locale.

| Set | Path | Read by |
|---|---|---|
| Storefront UI | [apps/storefront/messages](apps/storefront/messages) | next-intl |
| Emails | [apps/backend/src/emails/i18n/messages](apps/backend/src/emails/i18n/messages) | React Email templates |
| Seed | [apps/backend/src/migration-scripts/data/i18n/json](apps/backend/src/migration-scripts/data/i18n/json) | the seed script, as catalog translations |

Adding one key means adding it to all 36 files of that set, with a real translation rather than the
English string copied across. A missing key fails at runtime, not at build time, and this repository
has no parity gate. Check it yourself after touching a catalog:

```bash
node -e '
const fs=require("fs"),p="apps/storefront/messages";
const keys=f=>Object.entries(JSON.parse(fs.readFileSync(`${p}/${f}`,"utf8")))
  .flatMap(([s,v])=>typeof v==="object"?Object.keys(v).map(k=>`${s}.${k}`):[s]).sort();
const files=fs.readdirSync(p),ref=keys("en.json");
for(const f of files){const d=keys(f).filter(k=>!ref.includes(k)),m=ref.filter(k=>!keys(f).includes(k));
if(d.length||m.length)console.log(f,{missing:m,extra:d});}
console.log("checked",files.length,"catalogs against",ref.length,"keys");'
```

Two pieces of locale plumbing are worth knowing before you touch either.

Routing does not use next-intl's own prefixing. [routing.ts](apps/storefront/src/i18n/routing.ts)
sets `localePrefix` to `never`, and [middleware.ts](apps/storefront/src/middleware.ts) does the work
by hand. It resolves the locale from the URL, the `_medusa_locale` cookie or `Accept-Language`,
redirects a prefix-less path to `/{locale}/…`, and passes the locale to next-intl through the
`X-NEXT-INTL-LOCALE` header. [request.ts](apps/storefront/src/i18n/request.ts) falls back to the
cookie when there is no locale in the request.

Translated catalog content comes from an `x-medusa-locale` header that
[lib/config.ts](apps/storefront/src/lib/config.ts) attaches to every SDK call. A route that is not
locale-scoped has to use the `fetchWithoutLocale` export instead, otherwise whichever language
happens to fill the cache first is served to every visitor. [llms.txt](apps/storefront/src/app/llms.txt/route.ts)
is the worked example.

## Things That Break Silently

**The Tailwind content allowlist.** [tailwind.config.js](apps/storefront/tailwind.config.js) lists
the `@medusajs/ui` components this storefront actually imports, one glob each, because scanning the
whole kit cost about 19 KB of unused CSS. Importing a new primitive from `@medusajs/ui` means adding
its glob there. Skip that and the component renders unstyled, with no error anywhere.

**The middleware matcher.** `config.matcher` in [middleware.ts](apps/storefront/src/middleware.ts)
excludes `/api`, so a route handler under `src/app/api` gets no locale prefix and no country cookie
resolution. Take the locale from a query parameter or a cookie there, the way
[api/payment-return](apps/storefront/src/app/api/payment-return/route.ts) does.

**Cookie `sameSite` on the payment return.** `_medusa_jwt` and `_medusa_cart_id` are set `lax` in
[lib/data/cookies.ts](apps/storefront/src/lib/data/cookies.ts). A redirect-based payment method
brings the customer back through a cross-site top-level navigation, and a `strict` cookie is withheld
on it, which turns the return into a logged-out visitor with no cart. Do not tighten these to
`strict`.

**The seed is all or nothing.** `initial_data_seed` returns early when the sales channel named in
`data/store/json/store.json` already exists, so no stage runs on a database that has been seeded
once. Edits to the JSON data take effect on a fresh database only.

**Only JSON reaches the build.** [scripts/copy-migration-data.js](apps/backend/scripts/copy-migration-data.js)
copies `src/migration-scripts/data` into the build output and filters everything that is not a
directory or a `.json` file. Seed data in any other format is missing at runtime after `medusa build`.

## Relationship to Upstream

This repository tracks [medusajs/dtc-starter](https://github.com/medusajs/dtc-starter) by porting
selected commits, not by merging. The differences that matter when you carry a change across:

| Upstream | Here |
|---|---|
| `[countryCode]` route segment | `[locale]` segment, with the country in the `_medusa_country` cookie |
| No i18n | next-intl, 36 locales, RTL support |
| Local UI shims in `modules/common/components/ui` | `@medusajs/ui` directly |
| Multi-step checkout behind `?step=` | one-screen checkout with sheets, in `modules/checkout/components/checkout-*` |
| Root ESLint with `@medusajs/eslint-plugin` | storefront-only `next lint` |
| `@dtc/backend`, `@dtc/storefront` | `@dtc/gorgo-medusa-backend`, `@dtc/gorgo-medusa-storefront` |
| Storefront is optional | both apps always present |

`modules/checkout/components/payment` and `modules/checkout/components/review` are the upstream
step-based components and nothing imports them. They stay in the tree, and in sync with upstream, so
that porting a checkout change stays cheap. Update them alongside the live components instead of
deleting them.

To pull in upstream work:

```bash
git remote add upstream https://github.com/medusajs/dtc-starter
git fetch upstream
git log --oneline --no-merges <last-ported-commit>..upstream/main
```

Read each commit and decide one at a time. Dependency bumps are usually already applied here, and
anything touching routing, checkout or the UI shims needs adapting rather than cherry-picking.

## Commits

`<type>: <lowercase subject>` on one line, with `feat`, `fix`, `chore`, `docs` or `refactor` as the
type. No body, no trailers, no trailing period. Branches are `<type>/<short-description>`.

Split a formatting pass out of a substantive change, always.

## Writing

These rules cover the English prose in this repository, meaning the READMEs, the code comments, the
`.env.template` annotations and the storefront's `en.json` strings.

- Active voice and second person. "You set `DATABASE_URL`", not "`DATABASE_URL` is set".
- No em dashes in prose, and no asides set off with a pair of them. Split the sentence instead.
- A colon only before a list broken out onto its own lines, never inside a running sentence.
- Drop "under the hood", "simply", "just", "easy" and "obviously" rather than rephrasing them.
- Headings are statements in Title Case, never questions.
- Never state a version, a path or a behavior you have not traced to the source in this repository.

The UI strings carry one extra constraint, because they are translated 36 times over. Keep them
short and free of concatenation, and give ICU placeholders names that survive a translator who cannot
see the call site.
