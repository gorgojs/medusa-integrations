# MDX Components and Patterns

Real components and props actually used across `docs/`, verified against existing pages. Don't invent props or components not listed here — if you need something new, check whether an existing component already covers it first.

## Page shell

Every page:

```mdx
---
title: "Page Title"
description: "One sentence."
---

# {frontmatter.title}
```

`description` is one sentence, used for nav/meta — not a second heading.

## `<Note>`

```mdx
<Note type="default" title="">

Short inline note.

</Note>

<Note type="warning">

A gotcha worth calling out on its own paragraph.

</Note>

<Note type="success" title="Модуль интеграций">

Feature-flag style callout, used on plugin landing pages.

</Note>

<Note type="info" title="Что такое Модуль интеграций?">

Multi-paragraph note — blank line after the opening tag, blank line before the closing tag.

</Note>
```

`type` observed in this repo's docs: `default`, `warning`, `success`, `info` — no page uses `error`, so treat that as unconfirmed rather than assuming it exists just because other doc systems have it. An untitled `type="default"` note always carries an explicit `title=""` (never just omitted); an untitled `type="warning"` note does the opposite and always omits `title` entirely rather than passing `title=""`. Match whichever of the two you're writing. Always use the multi-line form — opening tag, blank line, content, blank line, closing tag — even for a single short sentence. Don't write `<Note ...>text</Note>` on one line.

## `<MedusaTypeList>`

The field/option reference table. One entry per row:

```mdx
<MedusaTypeList
  sectionTitle="Options"
  types={[
    {
      name: "apiKey",
      type: "string",
      description: "What it does. Use \\n for a bullet list inside one cell:\n- `a`\n- `b`",
      optional: true,
      defaultValue: "false",
      expandable: false,
      children: []
    }
  ]}
/>
```

- `sectionTitle` is a short label for the table, not a sentence — keep it in one language's alphabet (don't mix, e.g. `"Options (по типу)"` reads worse than plain `"Options"` with the distinction carried by the `##` heading above it instead).
- `optional`/`expandable` are always present, booleans. `defaultValue` (a string) is present only on rows that actually have a default.
- `description` supports `\n` for line breaks and inline code/markdown; keep it factual and traceable to the real type definition, not paraphrased from the field name.
- When a table would mix rows that only apply under different conditions (for example: fields that only apply for one `type` value each) and there are more than ~6 rows, add a short bullet list right before the table grouping names by condition, instead of relying on the reader to infer it from each row's description. Don't split into multiple `MedusaTypeList` tables for this — one table, one grouping list above it.

## `<CardList>`

```mdx
<CardList items={[
  {
    title: "Основные концепции",
    href: "/medusa-modules/integration/concepts"
  },
  {
    title: "Чтение параметров",
    href: "/medusa-modules/integration/reading-options"
  }
]}/>
```

One property per line inside each item, even though `title`/`href` would fit on one line — match this expanded form, not a compact `{ title: "...", href: "..." }` one-liner. Only `title` and `href`. Used for a module's `## Дальнейшие шаги`/`## Next steps`, a plugin's `## Разработчикам`/`## Development` section, and a module how-to page's closing `## Материалы`/`## References` section — wrap that link list in a `<CardList>` too (see `module-docs-style.md`).

## `<IntegrationCardList>`

The catalog grid on the module landing page's `## Доступные интеграции`/`## Available Integrations` — one entry per installed plugin:

```mdx
<IntegrationCardList items={[
  {
    slug: "apiship",
    icon: "https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/apiship.svg",
    label: "ApiShip",
    href: "/medusa-integrations/apiship",
    categoryLabel: "Фулфилмент"
  }
]}/>
```

`href` is the plugin's own landing page on this site (`/medusa-integrations/<slug>`), not an npm URL. `categoryLabel` is a short category name, translated per language (`"Фулфилмент"` / `"Fulfillment"`, `"Платежи"` / `"Payment"`, `"ERP"` stays `"ERP"`).

## `<UsedByList>`

A different component, for a plugin's own **real customers**, not for the module's integration catalog — only used so far on `t-kassa/{en,ru}.mdx`'s `## Кто использует этот плагин`/`## Who uses this plugin` (optional section; only add it when there's a real, named store to show):

```mdx
<UsedByList items={[
  {
    image: "https://static.gorgojs.com/www/medusa-cases/shop-example/example-logo.svg",
    alt: "Логотип shop.example",
    name: "Shop Example",
    href: "https://shop.example/",
    displayUrl: "shop.example",
    description: "Бренд мужской одежды",
  }
]}/>
```

Don't confuse the two: `IntegrationCardList` catalogs plugins (module side), `UsedByList` catalogs a plugin's real-world adopters (plugin side) — different props, different purpose, different page.

## `<AccentBadge>`

```mdx
- **[Модуль интеграций](/medusa-modules/integration)**<AccentBadge bage="New" />: ...
```

The prop is spelled `bage`, not `badge` — that's the real prop name in the component, reproduce it exactly or the badge won't render.

## `<CodeTabs>` / `<CodeTab>`

Package-manager install snippets, on plugin `getting-started(-beta)` pages:

```mdx
<CodeTabs>
  <CodeTab label="yarn" value="yarn">
    ```bash
    yarn add @gorgo/medusa-integration @gorgo/medusa-payment-acme@beta
    ```
  </CodeTab>
  <CodeTab label="npm" value="npm">
    ```bash
    npm install @gorgo/medusa-integration @gorgo/medusa-payment-acme@beta
    ```
  </CodeTab>
</CodeTabs>
```

## `<ChangelogTitle>` / `<ChangelogRenderer>`

The entire content of every `changelog/{en,ru}.mdx` — auto-rendered from the package's real `CHANGELOG.md`. Never hand-write changelog entries here.

```mdx
---
title: "История изменений @gorgo/medusa-payment-acme"
description: "История версий и примечания к релизам"
---

<ChangelogTitle pkg="@gorgo/medusa-payment-acme">История изменений</ChangelogTitle>

<ChangelogRenderer url="https://github.com/gorgojs/medusa-integrations/blob/main/packages/providers/payment-acme/CHANGELOG.md" />
```

## Code blocks

Always fenced with a language and, when the snippet represents a real file, a `title`:

~~~mdx
```ts title="providers/integration-acme/services/acme-integration.ts"
// code
```
~~~

- Use `// ...` for elided, unchanged surrounding code — don't paste a whole file when only one field changed.
- A plain literal (not a real file), like a `provider_id` shape, uses a bare fence with no `title`:

  ~~~mdx
  ```
  int_<identifier>[_<instanceId>]
  ```
  ~~~

## Screenshots — two real conventions, don't mix them

**GitHub user-attachment URLs**, for storefront/code-editing tutorials (`storefront-integration` pages) — pinned to the commit the tutorial was written against, immediately after the "open this file" instruction and before the code block:

```mdx
Откройте [`src/.../index.tsx`](https://github.com/gorgojs/medusa-integrations/blob/<commit>/examples/.../index.tsx#L212) и сделайте поле обязательным:

![Alt text describing the file explorer state](https://github.com/user-attachments/assets/<id>)

```tsx title="src/.../index.tsx"
```
```

**Local `/static/` paths**, for Admin UI walkthroughs (`settings(-beta)` pages), one per numbered-step section, per language:

```mdx
![Общий вид настроек Robokassa](/static/robokassa/ru/settings-overview.png)
```

If you don't have a real screenshot for either convention, leave `<!-- TODO: screenshot -->` — never invent a URL or path.

## Section dividers

This differs by area, so check the specific page you're editing rather than assuming:

- **Plugin docs** (`getting-started(-beta)`, `settings(-beta)`) consistently put `---` between every `##` section.
- **Module docs** are inconsistent right now: `concepts.mdx` and `reading-options.mdx` currently have none at all between sections; `migrate-provider-to-integration-module.mdx` uses a handful only at a few phase transitions (after the intro, before the first real step, before the closing "Итог"), not between every section or between individual `## Шаг N:` steps.

Match whatever the page you're editing already does rather than importing the other area's convention.
