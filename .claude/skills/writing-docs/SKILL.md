---
name: writing-docs
description: Writes and updates MDX documentation under docs/ in the medusa-integrations repo (module docs, per-plugin docs, and standalone tool docs). Use when adding a new doc page, updating existing content, documenting a new descriptor field or provider, or translating between en.mdx/ru.mdx. ALWAYS load this skill before modifying any file under docs/.
---

# Writing medusa-integrations Documentation

Skill for writing and updating MDX documentation under `docs/` in this repo. This repo's docs content is synced at build time into a separate private site builder (`gorgojs/gorgo`) — you cannot preview rendering locally, so correctness has to come from matching existing conventions exactly and verifying technical claims against the actual source in `packages/`.

## Constraints

> **CRITICAL:** Violating these produces pages that look right in the diff but render wrong or mislead readers.

- **Every doc page is bilingual.** A topic is a directory with `en.mdx` and `ru.mdx` side by side (for example `docs/medusa-modules/integration/concepts/{en,ru}.mdx`). Never add one language without the other.
- **`en.mdx` and `ru.mdx` must be structurally identical.** Same heading count and nesting, same code blocks in the same order with the same `title="..."` paths, same `MedusaTypeList` field names/order/`optional`/`defaultValue`, same links (translated anchor text is fine, translated `href` paths are not). Verify with `diff` on stripped structure, not by eye — see `reference/bilingual-and-prose.md`.
- **Never invent a technical claim.** Every fact about behavior (what a field does, what gets encrypted, when a hook runs, what a real registered path is) must be traceable to real source, not inferred from the feature's name. For most module/plugin docs that's `packages/modules/` or `packages/providers/` in this repo; `docs/tools/` pages can document a package that lives outside this repo entirely (`create-medusa-plugin` isn't in `packages/` at all) — find its real source or published docs before writing about it. If you can't find the source, say so instead of guessing.
- **Never write `# {frontmatter.title}` as anything else.** Every page's H1 is exactly `# {frontmatter.title}` — no page hardcodes its own H1 text, even when the reader-facing title reads like an instruction ("How to Create..."). Put that phrasing in `title` itself.
- **Don't invent screenshots.** If a step needs one and you don't have a real URL, leave `<!-- TODO: screenshot -->` — see `reference/mdx-components.md` for the two real screenshot conventions in use.
- **Don't leave a new page unlinked.** A module page needs an entry in its landing page's `Дальнейшие шаги`/`Next steps` (use `CardList` component); a module how-to page also needs a mutual link with any sibling page covering the complementary half of the same workflow, in each page's `## Материалы`/`## References`. When moving or renaming a page, `grep -rl "<old-path>" docs/` for every inbound link — including anchor links into a specific section, not just whole-page links — before considering the move done.

## Load Reference Files When Needed

> **Load at least one reference file before writing any content.**

| Task | Load |
|------|------|
| Which components/props exist, code block and screenshot conventions | `reference/mdx-components.md` |
| Writing/editing a page under `docs/medusa-modules/<module>/` | `reference/module-docs-style.md` |
| Writing/editing a page under `docs/medusa-integrations/<plugin>/` or `docs/tools/` | `reference/plugin-docs-style.md` |
| Checking en/ru parity, prose/voice choices, RU terminology glossary | `reference/bilingual-and-prose.md` |

Writing or editing any `ru.mdx` counts as "RU terminology" — load `reference/bilingual-and-prose.md` for the do-not-translate glossary before you write a single Russian sentence.

## Quick Reference

### Repo doc areas

| Area | Content path | Kind |
|---|---|---|
| Module docs | `docs/medusa-modules/<module>/` | Concepts, reference tables, how-to guides for `@gorgo/medusa-<module>` itself |
| Plugin docs | `docs/medusa-integrations/<plugin>/` | Per-integration landing page, getting-started, settings, storefront-integration, changelog |
| Tool docs | `docs/tools/<tool>/` | Standalone (`create-medusa-plugin`, `usage-data`) |

### Minimum page structure

```mdx
---
title: "Page Title"
description: "One sentence, shown in nav/meta."
---

# {frontmatter.title}

Content here.
```

### Links

Internal links are plain, absolute, site-root paths — never relative, never a `!bang!` prefix:

```mdx
[Основные концепции](/medusa-modules/integration/concepts)
[Читайте дальше](/medusa-modules/integration/concepts#идентификаторы-и-инстансы)
```

Anchors are auto-generated per-language from the heading text in that language — a `ru.mdx` anchor is the Cyrillic slug, not a translit or the English one.

## Common Mistakes

- [ ] `en.mdx` and `ru.mdx` drifting structurally (different heading count, a code example present in one but not the other)
- [ ] Translating literally instead of writing what a native speaker of that language would naturally write for the same technical fact
- [ ] Writing a "why"/"what is" heading as a literal question with `?` — this repo's convention is a statement-form heading, no question mark (`## Что такое модуль интеграций`, not `## Что такое модуль интеграций?`)
- [ ] A code example that doesn't match the real import path, real export shape (named vs default), or real signature in `packages/` — check the source, don't pattern-match from memory
- [ ] Using em dashes (`—`) in prose — rewrite the sentence to avoid them (an en dash as a bullet-item label separator, `**Label** – text`, is a separate, accepted pattern — see `reference/bilingual-and-prose.md`)
- [ ] Using passive voice ("настройки задаются", "is created", "can be configured") — write active ("задайте настройки", "you can configure", "call X to create")
- [ ] Using `e.g.,` / `т.е.` — write `for example` / `например` instead
- [ ] Translating a term this repo keeps transliterated in Russian (`воркфлоу`, `роут`, `инстанс`, `вебхук`, `дескриптор`, `кэш`) — `экземпляр`, `маршрут`, `рабочий процесс`, `крючок` are all wrong here
- [ ] The reverse: keeping a transliterated *verb* (`резолвить`, `рендерит`, `задеплоить`, `прокидывать`) or a slang noun (`рантайм`, `кастомный`, `конфиг`, `гайд`) — those get rewritten. Both lists live in `reference/bilingual-and-prose.md`
- [ ] Mismatching `## Шаг N:` (repo-native step-based tutorial style) with the numbered `## N. Title` reference style (modeled on docs.medusajs.com's own "How to Create a ... Provider" pages) — pick one per page, see `reference/module-docs-style.md`
- [ ] Adding a fields/options reference table without grouping rows by the thing they gate on (e.g. by `type`) when there are more than ~6 rows

## Reference Files

```
reference/mdx-components.md      - Real components/props used in this repo, code blocks, screenshots
reference/module-docs-style.md   - docs/medusa-modules/ page kinds and structure
reference/plugin-docs-style.md   - docs/medusa-integrations/ and docs/tools/ page kinds and structure
reference/bilingual-and-prose.md - en/ru parity checking, translation and prose style
```
