# Plugin and Tool Docs Style (`docs/medusa-integrations/<plugin>/`, `docs/tools/<tool>/`)

## Writing Style

- **Second person**: "You create a workflow..." not "We create..."
- **Imperative for steps**: "Create the file `src/provider/payment-my/my-payment.ts`..."
- **Present tense**: "The workflow runs..." not "The workflow will run..."
- **Concrete examples**: Every concept must have at least one working TypeScript code example
- **Sandwich every code example**: a lead-in sentence before it, a follow-up paragraph after it
- **No jargon without explanation**: Define terms on first use

## Landing page — `docs/medusa-integrations/<plugin>/{en,ru}.mdx`

```
---
title:
description:
---

<div><img .../></div> - plugin logo

# {frontmatter.title}

- intro paragraph

## Возможности плагина / Plugin Features

- bullet list, one bold lead-in each;
- the Integration Module bullet gets <AccentBadge bage="New" /> (note the real prop spelling)
- <Note type="success" title="Модуль интеграций"> - restates the Integration Module bullet as a callout

---

## Что такое <Service> / What is <Service>

— one paragraph on the third-party service, not on the plugin

---

## Кто использует этот плагин / Who uses this plugin

— OPTIONAL, only when there's a real, named store willing to be listed;
- <UsedByList> (see mdx-components.md — not the same component as the module landing page's integration catalog)

---

## Разработчикам / Development

- <CardList> to: 
  - dev environment setup (a GitHub tree link, not a doc page)
  - the changelog page

---

## 💬 Поддержка и сообщество / 💬 Support & Community

- Telegram links

---

## Дальнейшие шаги / Next steps

- <CardList> to the sibling pages
```

## `getting-started(-beta)/{en,ru}.mdx`

`-beta` is the current, Integration-Module-based setup path; the non-`-beta` sibling is the legacy pre-Integration-Module config and stays around for existing installs — don't merge them.

```
---
title: "Начало работы с <Plugin> для Medusa (v<version>-beta)" - version belongs in the title
description:
---

# {frontmatter.title}

- intro paragraph

## Требования / Requirements

- bullet list
- pin real version floors: Medusa, Node, the module's own version

---

## Установка / Installation

- <CodeTabs>/<CodeTab> with the yarn and npm install commands

---

## Настройка / Configuration

- medusa-config.ts registering BOTH providers side by side:
  - the integration provider, under `@gorgo/medusa-integration`'s `plugins` entry
  - the plugin's own domain provider (payment/fulfillment/etc.), under its real Medusa module in `modules`
  - one shared id constant between the two registrations
  - see the real medusa-config.ts in migrate-provider-to-integration-module.mdx for the exact shape
- .env snippet for the encryption key

---

## Параметры провайдера / Provider options

- <MedusaTypeList> with sectionTitle="ProviderOptions"
- only the medusa-config-time fields, typically just `id`
- NOT the Admin-configured settings: those live in the plugin's own descriptor and aren't re-documented per plugin

---

## <Domain-specific setup>

- e.g. "Настройка вебхуков" for a payment plugin
```

## `settings(-beta)/{en,ru}.mdx`

Admin end-user walkthrough — the audience is a store admin clicking through Medusa Admin, not a developer. Numbered steps, one screenshot per section, local `/static/<plugin>/<lang>/<name>.png` paths (see `mdx-components.md`):

```
# {frontmatter.title}

## Просмотр данных <Plugin> / View <Plugin> Details

- numbered steps: open Medusa Admin, then go to **Settings → Integrations → <Plugin>**
- ![Overview screenshot](/static/<plugin>/<lang>/settings-overview.png)

---

## Редактирование <конкретное имя секции> / Edit <that section's real name>

- one such section per settings section the descriptor declares
- name it after what that section actually holds, e.g. "Edit Robokassa Credential Parameters", not a generic "Edit Settings"
- its own numbered 1-5 steps, last one "Нажмите Сохранить" / "Click Save"
- its own screenshot

---

## <Any related domain-side admin step>

- e.g. "Добавление платежного провайдера", attaching the provider to a region
```

## `storefront-integration/{en,ru}.mdx`

Editing an existing scaffolded Next.js storefront project. Like the module how-to pages, this uses numbered `## Шаг N: <action>` / `## Step N: <action>` headings — but each step's body has its own fixed shape: "Откройте [`path`](GitHub blob URL pinned to a commit, with `#L<line>` anchor)" → GitHub user-attachment screenshot → code block with `title="<real relative path>"` → one paragraph explaining what the change accomplishes. See `mdx-components.md` for the exact screenshot URL shape. Ends with a "Полный пример кода интеграции в витрину" / "Full Storefront Integration Code Example" section linking a repo compare view instead of a link list.

## `changelog/{en,ru}.mdx`

Just `<ChangelogTitle>` + `<ChangelogRenderer>` — see `mdx-components.md`. Never hand-author entries here.

## `docs/tools/<tool>/{en,ru}.mdx`

Standalone, no fixed multi-page shape — `usage-data` is a single flat page (What is collected / What is never collected / How to opt out), `create-medusa-plugin` is a CLI usage guide. Match the page's own existing section rhythm rather than importing a plugin/module template that doesn't fit a single-page topic.
