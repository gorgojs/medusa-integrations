# Integration catalog

Machine-readable registry of Medusa integrations configurable through
[`@gorgo/medusa-integration`](../packages/modules/integration) — both Gorgo-authored and community.

Two consumers read this catalog:

- the **`gorgojs.com` scrapper**, which merges these entries into the site plugin catalog
  (`packages/site/content/plugins.yml` in the `gorgojs/gorgo` repo);
- the **Integrations → Browse** tab inside Medusa Admin (shows what a merchant *can* add, not just
  what's already applied).

## Layout

```
catalog/
├── integrations/<identifier>.yml   # one file per integration
├── icons/<identifier>.svg          # committed icon, referenced by `icon:`
├── authors.yml                     # authors referenced by an entry's `author:`
├── schema.json                     # integration-entry schema (CI-enforced)
├── authors.schema.json             # authors.yml schema (CI-enforced)
└── README.md
```

**One file per integration** keeps community PRs conflict-free — you touch only your own entry and
its icon, never a shared list.

## Add an integration (PR)

1. Copy [`integrations/example.yml`](integrations/example.yml) — the fully-annotated template
   (`active: false`, never surfaced) — to `integrations/<your-identifier>.yml` and fill it in.
2. Drop a **square** icon at `icons/<your-identifier>.svg` (SVG preferred, PNG accepted; ≤ 50 KB;
   **no remote references inside the SVG**).
3. Add yourself to [`authors.yml`](authors.yml) and point `author:` at your new id. There's no
   `official` flag — an entry's `author` (Gorgo vs. anyone else) is what distinguishes Gorgo-authored
   from community in the UI.
4. Open a PR. CI validates every entry against [`schema.json`](schema.json), `authors.yml` against
   [`authors.schema.json`](authors.schema.json), and that every `author` resolves to an author id.

Icons are **committed, not hotlinked**: they render inside a merchant's production Admin panel, so
the source must be reviewable in the PR — never an arbitrary external URL.

## Field reference

| Field | Required | Notes |
|---|---|---|
| `identifier` | yes | Stable id; matches the provider's `static identifier` where built on `AbstractIntegrationProvider`; unique; lowercase-kebab; matches the icon basename |
| `npm` | yes | Package that ships the integration |
| `category` | yes | `payment` / `fulfillment` / `marketplace` / `crm` / `erp` / `pim` / `notification` / `feed` / `tax` / `other` (distinct from the site's plugin `category`) |
| `author` | yes | Author `id` from [`authors.yml`](authors.yml) — Gorgo vs. community reads off this, there's no separate `official` flag |
| `displayName` | yes | `{ en, ru }` — card title |
| `icon` | yes | Filename under `icons/` |
| `repository` | yes | `https://…` |
| `shortDescription` | no | `{ en, ru }` — card subtitle (≤ 160 chars) |
| `docsUrl` | no | `https://…` |
| `configSnippet` | no | Illustrative `medusa-config.ts` registration (Admin setup drawer) |
| `active` | no | Default `true`; set `false` to hide |
| `supportsMultipleInstances` | no | Default `false` |

## Authors

`author` links an integration to an entry in [`authors.yml`](authors.yml) by `id` — a flat array of
`{ id, name: { en, ru }, url?, github?, active? }`. Only **Gorgo** exists today; community authors add
themselves in the same PR as their integration. Keep the `id` in sync with the site's `authors.yml`
where the same author already appears, so the scrapper merges onto the existing author instead of
creating a duplicate.

## Conventions

- **Quote all string scalars** to avoid YAML type coercion (`no` → `false`, unquoted versions
  becoming numbers, etc.).
- `identifier`, the `icon` basename, and (by convention) the docs slug stay in sync.
