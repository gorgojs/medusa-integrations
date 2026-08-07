# Module Docs Style (`docs/medusa-modules/<module>/`)

Docs for a module package itself (currently just `integration`, for `@gorgo/medusa-integration`). Four page kinds, each with its own shape.

## 1. Module landing page — `docs/medusa-modules/<module>/{en,ru}.mdx`

```
<div><img .../></div>          — logo
# {frontmatter.title}
intro paragraph(s)
<div><video .../></div>        — optional demo video
## Возможности / Features      — bullet list, one bold lead-in per bullet
---
## Доступные интеграции / Available Integrations  — <IntegrationCardList> catalog grid, if any
---
## 💬 Поддержка и сообщество / 💬 Support & Community   — Telegram links
## Дальнейшие шаги / Next steps — <CardList> to every sub-page in this module
```

The `## Дальнейшие шаги` `CardList` is the module's table of contents — every page you add under this module must get an entry here, or it's unreachable from the module's own nav.

## 2. Concept page — `concepts/{en,ru}.mdx`

Pure orientation, no step-by-step instructions, deliberately light on code — a reader should get the whole mental model in a few minutes. Observed section order for the `integration` module — reuse the shape, not the specific headings, for a different module:

```
## <Roles involved>
## <The central declarative object, with one worked example>
## <Where/when this applies>
## <Identifiers/addressing scheme>
## <The main lifecycle, intro paragraph>
### <lifecycle step 1>
### <lifecycle step 2>
### <lifecycle step 3>
...
## <Generated UI / admin surface>
### <sub-aspect>
## Дальнейшие шаги / Next steps
```

Each `###` lifecycle step is a short paragraph, not a worked example — a full field-by-field reference table or a multi-step code walkthrough belongs in a how-to page (kind 3 or 4 below), not here. If a concept genuinely needs a table or a code block to land, keep it small and directly load-bearing for that one paragraph; don't let a reference table grow to dominate the page's proportions — that's a sign it wants to be its own page instead.

## 3. How-to / tutorial page — repo-native style

Two different shapes live under this one style, depending on whether the content is topic-based or step-based. Don't mix them on one page.

**Topic-based** (`reading-options.mdx`) — for "here are N independent ways to do X":

```
# {frontmatter.title}
intro
<Note> pointing to the concept page for anything this guide doesn't re-explain
## <Topic>                      — a whole capability, e.g. "Хелпер resolveIntegrationOptions"
### <Sub-case>                  — a specific usage of it
## <Another topic>
## Материалы / References       — plain markdown link list, NOT a CardList
```

**Step-based** (`migrate-provider-to-integration-module.mdx`) — for a genuinely linear "do this, then this" migration/setup narrative:

```
# {frontmatter.title}
intro
## Зачем <делать это> / Why <do this>
## Пример <миграции/реализации> / Example   — grounds the guide in one real, named package
                                               in this repo, not a hypothetical
## Шаг 1: <action>
## Шаг 2: <action>
...                                          — flat ## siblings, NOT nested under a topic
                                               heading, and NOT ### — a step is its own
                                               top-level section
## Итог / Result                            — only on a before/after migration narrative
## Материалы / References
```

Don't force step numbering onto a page that's really "here are three independent ways to do X" (use the topic-based shape instead), and don't nest `## Шаг N:` under a wrapping `##` topic heading — every step is its own `##`.

## 4. How-to / tutorial page — official-reference style

Used when a page is explicitly modeling itself on one of docs.medusajs.com's own "How to Create a ... Module Provider" reference pages. So far this has been used once, for `create-integration-module-provider.mdx` — read that page directly for a full worked example instead of expecting a copy of its content here; its actual code and method list will keep evolving with the module's real API; what stays stable is the shape:

```
# {frontmatter.title}
intro: "In this document you'll learn how to create X and the methods you must implement."
<Note> pointing elsewhere for prerequisites/concepts

## Пример реализации / Implementation Example
   Link ONE real, already-shipped example of this kind of thing elsewhere in this repo
   as the model to read, not a hypothetical.

## 1. <Create the directory>
   One sentence: where the new thing goes on disk.

## 2. <Create the service/main file>
   Show a bare skeleton first (extends whatever base class, "// TODO add methods", one
   export) — mirrors the official reference's own incremental-reveal style. Then one
   ### per method/property the reader must or can implement:

   ### <method or property name>
   One-sentence explanation, an optional <Note> for a gotcha, then a nested
   #### Пример / #### Example sub-heading holding just that piece's own code —
   not the whole skeleton repeated in every sub-section. Repeat this
   ###-then-####-Пример pair for each method/property being documented.

## 3. <Create the definition/registration file>
   Whatever glues the thing from step 2 into the framework's own registration mechanism.

## 4. <Register it in the app's config>
   One <Note type="warning"> for whatever config-placement gotcha the real API has,
   if it has one — don't invent a warning where the API has none.

## 5. Протестируйте / Test it out
   An observable check (open the relevant Admin screen, or run the thing) followed by
   a programmatic check, then hand off to whichever guide already covers reading/using
   the result in depth, rather than re-explaining it here.

## Материалы / References
   Plain link list — link to that guide by its own real title, not by an invented
   paired label (see "Cross-linking" below for where a paired label does belong).
```

Don't mix this with the repo-native `## Шаг N:` style on the same page — pick one.

## Cross-linking

When two module pages cover complementary halves of one workflow, one page's prose can name-check the other by a short paired label to make the relationship obvious at that specific point (`create-integration-module-provider.mdx`'s step 5 links to reading-options.mdx inline as **"Использование провайдера интеграции"**). But the page's own `## Материалы` link list still uses that page's real `title` ("Чтение параметров") — don't let an inline paired label leak into the closing link list, where a reader expects the actual page title.
