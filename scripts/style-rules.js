/**
 * Machine-checkable half of the Gorgo writing voice.
 *
 * The prose rules live in the `gorgo-voice` skill (gorgojs/claude-plugins). This file encodes only
 * the part a regex can decide: banned strings, glossary violations, and two structural heading
 * rules. Everything requiring judgement (tone, "translated the sentence instead of the fact",
 * passive voice, colon-splice) stays with the `style-reviewer` agent.
 *
 * Pure data, no dependencies.
 *
 * SHARED CORE. This file is kept byte-identical between `medusa-integrations/scripts/` and
 * `gorgo/scripts/`. The glossary is one decision, not two, and the prose specification behind it is
 * the `gorgo-voice` skill (gorgojs/claude-plugins). When you change a rule here, change it in the
 * other repo in the same pull request, and check with:
 *
 *   diff medusa-integrations/scripts/style-rules.js gorgo/scripts/style-rules.js
 *
 * Anything genuinely repo-specific belongs in that repo's `style-lint.js` SURFACES block, not here.
 *
 * Severity:
 *   error - an exact string that is always wrong. Fails CI.
 *   warn  - a heuristic that can false-positive. Reported, does not fail CI.
 *
 * `lang`: 'ru' | 'en' | 'any' — which side of a bilingual pair the rule applies to.
 *
 * NOTE: never use \b or \w in a Cyrillic pattern. Both are defined over ASCII [A-Za-z0-9_], so a
 * pattern like \bэкземпляр matches nothing at all: the position before "э" is not a word boundary,
 * and a trailing \w cannot consume a Russian ending either. Use a (?<!\p{L}) lookbehind for the
 * left boundary and \p{L} for the morphological ending instead.
 */

/** Glossary violations: a term that already lost to another rendering. */
const RU_GLOSSARY = [
  { id: 'ru/instance', re: /(?<!\p{L})экземпляр\p{L}*/giu, fix: 'инстанс' },
  { id: 'ru/route', re: /(?<!\p{L})маршрут\p{L}*/giu, fix: 'роут' },
  {
    id: 'ru/workflow',
    re: /(?<!\p{L})рабоч\p{L}+\s+процесс\p{L}*/giu,
    fix: 'воркфлоу',
  },
  {
    id: 'ru/hook',
    re: /(?<!\p{L})(?:крючок|крючк\p{L}+|перехватчик\p{L}*)/giu,
    fix: 'хук',
  },
  { id: 'ru/cache', re: /(?<!\p{L})кеш\p{L}*/giu, fix: 'кэш' },
  {
    id: 'ru/admin-panel',
    re: /(?<!\p{L})админк\p{L}+/giu,
    fix: 'панель администратора',
  },
];

/**
 * Transliterated verbs and slang nouns. An accepted term names a thing (`резолвер`, `кэш`); a
 * transliterated verb or a stand-in for a phrase Russian already has does not.
 */
const RU_SLANG = [
  {
    id: 'ru/resolve-verb',
    re: /(?<!\p{L})резолв(?:ить|ится|ятся|нут\p{L}*|им\p{L}*)/giu,
    fix: 'получить из контейнера / итоговые опции',
  },
  {
    id: 'ru/runtime',
    re: /(?<!\p{L})рантайм\p{L}*/giu,
    fix: 'во время выполнения',
  },
  {
    id: 'ru/render-verb',
    re: /(?<!\p{L})рендер(?:ит|ят|инг\p{L}*|итс\p{L}*)/giu,
    fix: 'отрисовывает / при отрисовке',
  },
  {
    id: 'ru/deploy-verb',
    re: /(?<!\p{L})(?:задеплои\p{L}+|передеплой\p{L}*|деплоит\p{L}*)/giu,
    fix: 'развернуть / повторное развёртывание',
  },
  { id: 'ru/merge-verb', re: /(?<!\p{L})см[её]рж\p{L}+/giu, fix: 'объединит' },
  {
    id: 'ru/pass-through',
    re: /(?<!\p{L})(?:прокидыва\p{L}+|прокин(?:ем|ет|ут|уть|ь|ул\p{L}*))/giu,
    fix: 'передавать',
  },
  { id: 'ru/custom', re: /(?<!\p{L})кастомн\p{L}+/giu, fix: 'собственный' },
  { id: 'ru/guide', re: /(?<!\p{L})гайд(?!лайн)\p{L}*/giu, fix: 'руководство' },
  // `конфигурация` is correct; bare `конфиг`/`конфига`/`конфиге` is not.
  {
    id: 'ru/config',
    re: /(?<!\p{L})конфиг(?!ур)\p{L}*/giu,
    fix: 'конфигурация',
  },
  {
    id: 'ru/default',
    re: /(?<!\p{L})(?:дефолтн\p{L}+|по\s+дефолту)/giu,
    fix: 'по умолчанию',
  },
  {
    id: 'ru/out-of-box',
    re: /(?<!\p{L})из\s+коробки/giu,
    fix: 'предоставляется по умолчанию',
  },
];

/** Applies in both languages. */
const PROSE = [
  {
    id: 'any/under-the-hood',
    lang: 'any',
    re: /под\s+капотом|under\s+the\s+hood/giu,
    fix: 'say what actually happens',
  },
  {
    id: 'en/eg',
    lang: 'en',
    re: /\b(?:e\.g\.|i\.e\.)/gi,
    fix: '"for example"',
  },
  { id: 'ru/te', lang: 'ru', re: /(?<!\p{L})т\.\s?е\./giu, fix: '"то есть"' },
  {
    id: 'en/filler',
    lang: 'en',
    re: /\b(?:simply|obviously|basically)\b/gi,
    fix: 'remove the word',
  },
  {
    id: 'ru/filler',
    lang: 'ru',
    re: /(?<!\p{L})очевидно,/giu,
    fix: 'remove the word',
  },
];

/** A heading under one of these sections is allowed to be a question. */
const FAQ_SECTION =
  /\b(faq|frequently asked)\b|часто задаваемые|вопросы и ответы/i;

/** English headings that are lowercased where the house style capitalizes. */
const TITLE_CASE_LOWERCASE_OK = new Set([
  'a',
  'an',
  'the',
  'of',
  'in',
  'on',
  'to',
  'for',
  'with',
  'from',
  'at',
  'by',
  'into',
  'through',
  'without',
  'and',
  'or',
  'but',
  'nor',
  // tool and product names that are lowercase by their own convention
  'npm',
  'yarn',
  'pnpm',
  'nginx',
  'ansible',
  'docker',
  'git',
  'json',
  'yaml',
  'v1',
  'v2',
]);

module.exports = {
  /** Substring rules, checked against prose with code fences and frontmatter stripped. */
  substring: [
    ...RU_GLOSSARY.map((r) => ({
      ...r,
      lang: 'ru',
      severity: 'error',
      kind: 'glossary',
    })),
    ...RU_SLANG.map((r) => ({
      ...r,
      lang: 'ru',
      severity: 'error',
      kind: 'slang',
    })),
    ...PROSE.map((r) => ({ ...r, severity: 'error', kind: 'prose' })),
    // Heuristic: an em dash is banned in running prose, but it is also ordinary Russian
    // punctuation, so legacy pages carry many. Warn rather than block.
    {
      id: 'any/em-dash',
      lang: 'any',
      re: /—/gu,
      severity: 'warn',
      kind: 'prose',
      fix: 'split the sentence, or use a verb',
    },
  ],

  /**
   * Whole-document rules. `test(prose, ctx)` receives the masked prose (code and frontmatter already
   * blanked) plus `ctx.lang`. For defects that no single line reveals.
   */
  document: [
    {
      id: 'ru/untranslated',
      lang: 'ru',
      severity: 'warn',
      kind: 'translation',
      fix: 'translate the page, or delete it until it is translated',
      // A page copied from en.md and never translated is invisible to every other check: no Russian
      // rule fires because there is no Russian, no English rule fires because the file is declared
      // ru, and a structural parity check passes perfectly because a copy matches its original.
      test: (prose) => {
        const words = prose.match(/[\p{L}]{3,}/gu) || [];
        if (words.length < 50) return false;
        return !/[а-яё]/i.test(prose);
      },
    },
    {
      id: 'en/untranslated',
      lang: 'en',
      severity: 'warn',
      kind: 'translation',
      fix: 'this page is declared English but reads as Russian',
      test: (prose) => {
        const words = prose.match(/[\p{L}]{3,}/gu) || [];
        if (words.length < 50) return false;
        const cyr = (prose.match(/[а-яё]/gi) || []).length;
        const lat = (prose.match(/[a-z]/gi) || []).length;
        return cyr > lat;
      },
    },
  ],

  /**
   * Heading rules. `test(text, ctx)` receives the heading text with the leading #s stripped, plus
   * `ctx.section` — the nearest preceding H2, so a rule can be section-aware.
   */
  heading: [
    {
      id: 'any/question-heading',
      lang: 'any',
      severity: 'error',
      kind: 'heading',
      fix: 'statement form, no question mark',
      // A question mark is banned in a heading that names a topic, because "## What Is X" reads as a
      // reference section and "## What is X?" reads as a conversation. An FAQ is the exception: its
      // headings ARE the questions, and rewriting them into statements would break the format.
      test: (text, ctx) =>
        /\?\s*$/.test(text) && !FAQ_SECTION.test(ctx.section || ''),
    },
    {
      id: 'en/title-case',
      lang: 'en',
      severity: 'warn',
      kind: 'heading',
      fix: 'capitalize every word except articles, prepositions and coordinating conjunctions',
      test: (text) => {
        // Skip headings that are or contain a code identifier, and frontmatter-driven H1s.
        if (text.includes('`') || text.includes('{')) return false;
        const words = text
          .replace(/^\d+\.\s*/, '')
          .replace(/^Step\s+\d+:\s*/i, '')
          .split(/\s+/);
        if (words.length < 2) return false;
        return words.some((w, i) => {
          if (i === 0 || i === words.length - 1) return false;
          const bare = w.replace(/[^A-Za-z-]/g, '');
          if (!bare || !/^[a-z]/.test(bare)) return false;
          return !TITLE_CASE_LOWERCASE_OK.has(bare.toLowerCase());
        });
      },
    },
  ],

  TITLE_CASE_LOWERCASE_OK,
};
