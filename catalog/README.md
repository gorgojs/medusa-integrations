# Integration catalog

Machine-readable registry of Medusa integrations configurable through
[`@gorgo/medusa-integration`](../packages/modules/integration) — both Gorgo-authored and community.

Three consumers read this catalog:

- the **`gorgojs.com` scrapper**, which merges these entries into the site plugin catalog
  (`packages/site/content/plugins.yml` in the `gorgojs/gorgo` repo);
- the **Integrations → Browse** tab inside Medusa Admin (shows what a merchant *can* add, not just
  what's already applied);
- the **offline fallback shipped with the plugin** —
  `packages/modules/integration/src/lib/catalog.generated.ts`, what Admin displays when
  `gorgojs.com` is unreachable.

> **After changing any entry, regenerate the fallback and commit it:**
> `cd packages/modules/integration && yarn catalog:gen`
>
> `prepublishOnly` runs the same script, so a release can never ship a stale fallback — but until
> someone regenerates, the committed `catalog.generated.ts` lags the catalog, and that is what
> anyone reading the repo or running from source sees.
>
> The generator derives `slug` from `npm` and `authorLocalized` from `authors.yml`, and fails
> loudly on an entry whose `author` does not resolve.

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

**Keep the icon small — under ~12 KB of source.** The generator inlines it into the offline
fallback as a data URI, but only while the encoded result stays under 16 KB; past that the entry
keeps a hosted URL and its icon simply does not render when `gorgojs.com` is unreachable. An SVG
exported at 512×512 with flattened paths is typically 1–3 KB; a PNG at that size is not, so prefer
SVG. `yarn catalog:gen` warns by name about every icon it had to skip.

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
| `docsSnippet` | no | `{ en, ru }` — markdown-инструкция для Admin setup drawer (ограниченный подсет, ≤ 8000 символов на язык) |
| `active` | no | Default `true`; set `false` to hide |
| `supportsMultipleInstances` | no | Default `false` |

## docsSnippet

Единственное, что показывает Admin в модалке установки. Поддерживается **ограниченный подсет
markdown**: заголовки `#`–`###`, абзацы, плоские списки, fenced code с кнопкой Copy, inline code,
`**bold**`/`*italic*`, ссылки **только `https://`**.

Всё остальное — сырой HTML, картинки, таблицы, вложенные списки — рендерится **буквальным
текстом**. Это не ошибка, а гарантия: модалка живёт внутри аутентифицированной админки мерчанта,
поэтому разметка собирается по белому списку, а не санитайзится.

Подпись блока кода берётся из info string фенса: ` ```medusa-config.ts ` даёт подпись
«medusa-config.ts».

Включайте команду установки — она больше не захардкожена в UI. Заполняйте `docsUrl`, а не
дублируйте ссылку на документацию в тексте сниппета: ссылка в футере модалки появляется, только
когда `docsUrl` заполнен, — без него у модалки не остаётся пути на документацию вовсе.

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
