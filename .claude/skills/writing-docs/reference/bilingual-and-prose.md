# Bilingual Parity and Prose Style

## Checking en/ru structural parity

Never eyeball this — diff the structure directly.

```bash
# heading levels line up 1:1
diff <(grep -o "^#\+" en.mdx) <(grep -o "^#\+" ru.mdx)

# same line count (a strong signal, not a proof, of matching structure)
wc -l en.mdx ru.mdx

# code fences in the same order, same title= paths
diff <(grep -n '^```' en.mdx | sed 's/^[0-9]*://') <(grep -n '^```' ru.mdx | sed 's/^[0-9]*://')

# MedusaTypeList field names, in order
diff <(grep -n 'name: ' en.mdx | sed 's/^[0-9]*://') <(grep -n 'name: ' ru.mdx | sed 's/^[0-9]*://')

# same optional/defaultValue flags
diff <(grep -o 'optional: true\|optional: false' en.mdx) <(grep -o 'optional: true\|optional: false' ru.mdx)

# same internal hrefs (anchors are expected to differ — see below)
diff <(grep -oE '\(/[a-z/-]+\)' en.mdx) <(grep -oE '\(/[a-z/-]+\)' ru.mdx)
```

A page-internal anchor link legitimately differs between languages, because the anchor is auto-generated from that language's own heading text (a Cyrillic heading produces a Cyrillic slug). Only flag an anchor diff if the *target section* it resolves to doesn't correspond between languages, not because the slug string itself differs.

If you're translating an existing page into the other language, run the diff immediately after writing — structural drift creeps in one clause at a time when writing free-hand, and is much cheaper to catch right away than later.

## Translate the fact, not the sentence

Don't produce a word-for-word rendering. Write what a native speaker would naturally write to state the same technical fact, even if that means restructuring the sentence, dropping a word English needs and Russian doesn't (or the reverse), or picking a different part of speech to express the same relationship. A translation that reads as "obviously translated" has usually copied English sentence structure into Russian (or vice versa) instead of re-expressing the fact.

When a rough draft in one language is handed to you as a *pattern* to follow (heading order, section names, what to cover), that's a structural instruction, not a translation request — reproduce the structure, but still write natural, independent prose for the content in each language.

## Terminology: terms that stay transliterated in Russian

These docs are written for Russian-speaking Medusa developers, who say the transliterated term, not
the dictionary translation. Treat the table below as a **do-not-translate list**: when the English
side uses one of these, the Russian side uses the transliteration, and you never "improve" an
existing transliteration into its formal Russian equivalent.

| EN | RU | Notes |
|---|---|---|
| workflow | воркфлоу | Indeclinable: `внутри воркфлоу`, `запускает воркфлоу`, `без воркфлоу` |
| route / API route | роут / API-роут | Declines normally (`роуты`, `роута`, `роутов`). `API-роут` is hyphenated |
| instance | инстанс | Declines normally. Also in compounds: `идентификатор инстанса` |
| provider | провайдер | |
| plugin | плагин | |
| module | модуль | |
| container | контейнер | `изолированный контейнер модуля`, `контейнер приложения` |
| descriptor | дескриптор | |
| webhook | вебхук | One word, no hyphen |
| hook (React) | хук | Only the React sense. A webhook URL path is `вебхук` |
| resolver | резолвер | The **noun** only. The verb `резолвить` is not accepted, see "Transliterations that are *not* accepted" below |
| cache | кэш | `кэширование`, `кэшируются` |
| widget | виджет | |
| token | токен | |
| migration | миграция | |
| backend | бэкенд | |

Terms that go the **other** way — translate these, don't transliterate:

| EN | RU | Notes |
|---|---|---|
| storefront | витрина (магазина) | On a page's first mention, gloss the English once: `storefront (витрину магазина)`. After that, just `витрина`. Keep `medusa-storefront` as-is in paths and repo names |
| subscriber | подписчик | |
| scheduled job | запланированная задача | |
| admin (dashboard) | панель администратора / администратор | Not `админка` |
| settings | настройки | |
| option | параметр *or* опция | Split by sense, and the split is deliberate: `параметр` is the default in running prose (`параметры интеграции`, `Чтение параметров`, `параметры доступа`), `опция` only where the word sits next to the literal identifier (`чтение опций через resolveIntegrationOptions`, `Опция sameSite`, `{ ..., options: {} }`) or labels a UI toggle or a CLI's `[options]` |
| environment variable | переменная окружения | |
| deployment | развёртывание | |
| step | шаг | |
| cart | корзина | |
| checkout | оформление заказа | |
| fallback | резервный | |
| redirect | редирект *or* перенаправление | Split by sense, and the split is deliberate: `редирект` for the mechanism (`междоменные редиректы`, `этот API-роут обрабатывает редирект`), `перенаправление` for what happens to the buyer (`подготовит покупателя к перенаправлению`) |
| getter / setter | свойство через `get` / свойство через `set` | This repo already says "метод `initiatePayment`" rather than coining a noun for "method" — do the same here. Don't force a noun (`геттер`, `сеттер`, `аксессор`); restructure the sentence around the literal `get`/`set` keyword: `descriptor` объявлен как абстрактное свойство через `get`, not `объявлен абстрактным геттером` |

Never use these renderings — each one already lost to a transliteration above, and reintroducing it
splits the vocabulary of the docs:

```
❌ экземпляр (для instance)   ✅ инстанс
❌ маршрут (для route)         ✅ роут
❌ рабочий процесс / сценарий  ✅ воркфлоу
❌ крючок / перехватчик        ✅ хук
❌ кеш                         ✅ кэш
```

### Transliterations that are *not* accepted

An accepted term is one the ecosystem uses as a name for a thing. A transliterated **verb or
participle** built off an English root is developer slang, and this repo's Russian prose doesn't use
it — even though the older pages still contain some. Rewrite on touch:

| ❌ Slang | ✅ Write instead |
|---|---|
| резолвить, резолвится, резолвнутые опции | получить из контейнера; итоговые опции |
| рантайм, в рантайме | во время выполнения |
| рендерит, при рендеринге | отрисовывает; при отрисовке |
| задеплоить, передеплой | развернуть, повторное развёртывание |
| смёржит | объединит |
| прокидывать | передавать |
| кастомный | собственный |
| гайд | руководство |
| конфиг | конфигурация |
| дефолтный, по дефолту | по умолчанию |
| из коробки | предоставляется по умолчанию |

The line is the part of speech, not the alphabet: `резолвер` (a named component) stays, `резолвить`
(a verb) goes; `кэш` stays, `рантайм` goes because it's standing in for a plain phrase Russian
already has.

### Verbs paired with the wrong object

`прочитать`/`читать` implies literal text or document content. A config record (an integration, an instance, a provider) isn't read, it's obtained — swap the verb. And this repo's established object for `получить` is the record's options, not the record itself (`потребитель получает параметры`, not `потребитель получает интеграцию`) — swap the object to match too:

| ❌ | ✅ |
|---|---|
| прочитать интеграцию | получить параметры интеграции |

Two more standing conventions in the Russian prose:

- **Write `ё`.** The docs use it consistently (`платёжный`, `передаётся`, `развёртывание`, `объём`), so don't drop it to `е`.
- **A Latin term glued to a Russian suffix takes a hyphen:** `API-роут`, `UI-компонент`, `admin-панель`.

When you hit a term that isn't in either table, check what the existing `ru.mdx` pages already do
before inventing a rendering:

```bash
grep -rn "<candidate>" docs --include=ru.mdx | head
```

Pick whichever form is already established and add it here; a term rendered two ways across the docs
is worse than either rendering on its own.

## Voice

Second-person imperative is the default for instructional content: "set X", "add the provider", "you can configure...". Avoid first-person plural ("we", "our") in how-to and reference content — there's rarely a reason to speak as "we" when directly instructing a reader what to do; it belongs, if anywhere, in prose that's explicitly speaking as the project/maintainers about their own decisions, not in step-by-step instructions.

Prefer active voice where an active rewrite is available and no less clear:

```
❌ Settings are declared in the descriptor.
✅ You declare settings in the descriptor.

❌ Custom domains can be configured in the settings.
✅ You can configure custom domains in the settings.
```

Some passive constructions are fine when there's no natural actor to name ("options are resolved at runtime" — nothing meaningfully "resolves" it on purpose from the reader's point of view). Don't contort a sentence just to avoid passive voice when the active form would need an invented subject.

## "Admin" — capitalized alone, dropped in front of UI/API/i18n

Two different rules for two different things, don't conflate them:

- **`Admin` standalone, capitalized**, when it names the Medusa Admin product itself as a place or thing: "in Admin", "Medusa Admin", "shown to the admin in the Admin". Applies in both languages.
- **No "admin"/"Admin" qualifier at all** in front of `UI`, `CRUD API`, or `i18n` when talking about a module's own generated surface — this repo's established phrasing is bare `the UI`, `the CRUD API` (see `create-integration-module-provider.mdx`'s "It generates the UI, provides a CRUD API..." and `migrate-provider-to-integration-module.mdx`'s identical line). Don't write `the admin UI` or `the Admin CRUD API` — the "admin" is implied by context (a Medusa module only ever generates Admin-side UI) and adding it back is redundant, not a missing capitalization.

Keep lowercase `admin` only for the generic human role, not the product: "the store admin", "an admin", RU "администратор магазина". That's a person, not the app.

The hyphenated Latin-plus-Russian-suffix compound documented in `mdx-components.md` (`admin-виджет`, `admin-панель`, `admin-компонент`) is a separate, unrelated convention about RU word-formation mechanics — leave those alone.

## Headings

- Statement form, never a literal question, even for "why"/"what is" headings — `## What this module does`, not `## What does this module do?`. Apply this in both languages.
- H1 is always `# {frontmatter.title}`. If a page's reader-facing heading should read like an instruction ("How to Create a Provider"), put that phrasing in `title` itself — never hardcode a different literal H1 string on the page.

## Em dash vs. en dash

Two different characters with two different, non-overlapping jobs:

- **Em dash (`—`) inside a prose sentence — avoid it.** Rewrite instead of reaching for a dash to join a subject directly to a following clause or verb. Options, roughly in order of preference:
  - Split into two sentences.
  - Use a verb: "X is Y" instead of "X — Y".
  - Use "both...and..." instead of "..., — ...".

  A dash joining a plain noun to its noun-phrase definition ("The key is any non-empty string") is the more defensible of the two uses, grammatically, but still avoid it — the rule for this repo's prose is no em dash in running prose, not "only the ungrammatical uses of it."

- **En dash (`–`) as a bullet-item label separator — this is a different, accepted pattern.** Used to separate a bold label from its explanation inside one bullet point (`**Label** – explanation of the label`). Don't confuse this with the em-dash rule above; it's a distinct character doing a distinct, structural job, not a stand-in for a comma or a joining clause in a sentence.

## Other prose rules

- No `e.g.,` — write "for example" instead (and its equivalent in the other language, not a literal abbreviation).
- No filler words that don't carry information: "simply", "just", "easy", "obviously", "basically" — remove rather than translate them.
- No bare URLs in prose — always `[label](url)`.
- Keep sentences short enough to parse in one pass; split a sentence carrying two unrelated claims rather than joining them with a comma.
- Verify every technical claim (what a field does, what a real import path is, what a hook's signature is) against the real source before writing it — see `SKILL.md`'s constraint on this. An admittedly-unverified placeholder is more useful to the next editor than a confident, wrong statement.
- Don't attribute a fact to "TypeScript" by name — every code sample in these docs is already TypeScript, so naming it adds nothing the `ts` fence's language tag doesn't already say. State what happens instead of who enforces it:

  ```
  ❌ TypeScript requires a subclass to implement its `descriptor` property.
  ✅ `AbstractIntegrationProvider` is abstract, so a subclass must implement its `descriptor` property.

  ❌ `static identifier`, which TypeScript doesn't enforce but the loader relies on.
  ✅ `static identifier`, which the loader relies on.
  ```

  This is one instance of a broader habit: name the actual class/type/function responsible for a behavior, not the language or tool running it.
