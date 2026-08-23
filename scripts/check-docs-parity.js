#!/usr/bin/env node
/**
 * Bilingual structural parity gate for MDX doc pages. Zero dependencies.
 *
 * `en.mdx` and `ru.mdx` in the same directory must have the same structure. What must match and what
 * legitimately differs is specified in `writing-docs/reference/bilingual-parity.md` in the
 * gorgojs/claude-plugins repo; this script is that specification made executable.
 *
 *   node scripts/check-docs-parity.js                 # all of docs/
 *   node scripts/check-docs-parity.js docs/tools      # a subtree
 *   node scripts/check-docs-parity.js --json
 *
 * Exit code 1 on any mismatch, or on a page that exists in one language only.
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const roots = argv.filter((a) => !a.startsWith('--'));

/** Every directory under root that holds an en.mdx or ru.mdx. */
function topicDirs(root) {
  const abs = path.resolve(REPO_ROOT, root);
  const out = [];
  if (!fs.existsSync(abs)) return out;
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (entries.some((e) => e.isFile() && /^(en|ru)\.mdx$/.test(e.name)))
      out.push(dir);
    for (const e of entries) {
      if (
        e.isDirectory() &&
        !e.name.startsWith('.') &&
        e.name !== 'node_modules'
      ) {
        walk(path.join(dir, e.name));
      }
    }
  };
  walk(abs);
  return out;
}

function stripFrontmatter(src) {
  return src.startsWith('---\n')
    ? src.slice(src.indexOf('\n---\n', 4) + 5)
    : src;
}

/** Everything we compare, extracted from one page. */
function shape(src) {
  const body = stripFrontmatter(src);

  // Split on fences so heading extraction never reads a comment inside a code block.
  const fences = [];
  const outside = body.replace(
    /^(```+)([^\n]*)\n([\s\S]*?)^\1\s*$/gm,
    (_m, _t, info) => {
      fences.push(info.trim());
      return '\n<<FENCE>>\n';
    },
  );

  return {
    // heading levels only; the text is translated, the nesting is not
    headings: outside
      .split('\n')
      .map((l) => l.match(/^(#{1,6})\s+\S/))
      .filter(Boolean)
      .map((m) => m[1].length),
    fences: fences.map(normalizeFence),
    // MedusaTypeList field names, in order
    fieldNames: [...body.matchAll(/^\s*name:\s*"?([\w.[\]-]+)"?/gm)].map(
      (m) => m[1],
    ),
    flags: [
      ...body.matchAll(/\b(optional|defaultValue):\s*("[^"]*"|\S+)/g),
    ].map((m) => normalizeFlag(m[1], m[2])),
    hrefs: [...body.matchAll(/\]\((\/[^)\s#]*)(?:#[^)\s]*)?\)/g)].map((m) =>
      normalizeHref(m[1]),
    ),
  };
}

/**
 * Three kinds of difference between en.mdx and ru.mdx are legitimate and must not be reported.
 * Each was found by running this gate against the existing docs, not predicted.
 */

/** Screenshots are shot per language, so /static/<x>/en/… and /static/<x>/ru/… are the same asset. */
function normalizeHref(href) {
  return href.replace(/^\/static\/([^/]+)\/(en|ru)\//, '/static/$1/<lang>/');
}

/**
 * A fence's `title=` is a file path when it names one, and reader-facing prose when it is a label
 * ("Terminal" / "Терминал"). Compare the language tag and whether a title exists; compare the title
 * itself only when it looks like a path.
 */
function normalizeFence(info) {
  const lang = (info.match(/^\S+/) || [''])[0];
  const title = (info.match(/title="([^"]*)"/) || [])[1];
  if (title === undefined) return lang;
  const isPath = /[/.]/.test(title) && !/\s/.test(title);
  return isPath ? `${lang} title="${title}"` : `${lang} title=<label>`;
}

/**
 * `optional` is a boolean and must match. A `defaultValue` is a literal when it is code-ish, and
 * reader-facing prose when it is a phrase ("Current directory" / "Текущая директория").
 */
function normalizeFlag(key, raw) {
  if (key === 'optional') return `optional=${raw}`;
  const value = raw.replace(/^"|"$/g, '');
  const isLiteral = !/\s/.test(value) && !/[\u0400-\u04FF]/.test(value);
  return isLiteral ? `defaultValue=${raw}` : 'defaultValue=<prose>';
}

function compare(dir) {
  const rel = path.relative(REPO_ROOT, dir);
  const en = path.join(dir, 'en.mdx');
  const ru = path.join(dir, 'ru.mdx');

  if (!fs.existsSync(en) || !fs.existsSync(ru)) {
    problems.push({
      topic: rel,
      check: 'missing-language',
      detail: `only ${fs.existsSync(en) ? 'en' : 'ru'}.mdx exists; every topic must be bilingual`,
    });
    return;
  }

  const a = shape(fs.readFileSync(en, 'utf8'));
  const b = shape(fs.readFileSync(ru, 'utf8'));

  const checks = [
    ['headings', 'heading levels and nesting'],
    ['fences', 'code fences (language tag and title= path), in order'],
    ['fieldNames', 'MedusaTypeList field names, in order'],
    ['flags', 'optional / defaultValue flags, in order'],
    ['hrefs', 'internal link paths (anchors excluded)'],
  ];

  for (const [key, label] of checks) {
    const x = a[key],
      y = b[key];
    if (x.length !== y.length) {
      problems.push({
        topic: rel,
        check: key,
        detail: `${label}: en has ${x.length}, ru has ${y.length}`,
        en: x.length,
        ru: y.length,
      });
      continue;
    }
    // Report every differing item, not just the first: one page often has the same omission
    // repeated, and stopping early hides how much there is to fix.
    x.forEach((v, n) => {
      if (v === y[n]) return;
      problems.push({
        topic: rel,
        check: key,
        detail: `${label}: item ${n + 1} differs, en ${JSON.stringify(v)} vs ru ${JSON.stringify(y[n])}`,
      });
    });
  }
}

const problems = [];
for (const root of roots.length ? roots : ['docs']) {
  for (const d of topicDirs(root)) compare(d);
}

const topics = new Set(problems.map((p) => p.topic));

if (asJson) {
  console.log(JSON.stringify({ problems }, null, 2));
} else {
  const byTopic = new Map();
  for (const p of problems) {
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic).push(p);
  }
  for (const [topic, list] of [...byTopic].sort()) {
    console.log(`\n${topic}`);
    for (const p of list) console.log(`  ${p.check.padEnd(18)} ${p.detail}`);
  }
  console.log(`\n${'─'.repeat(72)}`);
  console.log(
    problems.length
      ? `${problems.length} mismatch(es) across ${topics.size} topic(s)`
      : 'all topics structurally in parity',
  );
}

process.exit(problems.length ? 1 : 0);
