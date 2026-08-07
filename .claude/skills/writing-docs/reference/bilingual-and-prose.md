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
