#!/usr/bin/env node
/**
 * Style linter for this repo's content. Zero dependencies.
 *
 * Checks the machine-decidable half of the Gorgo writing voice, specified in the `gorgo-voice` skill
 * (gorgojs/claude-plugins). Everything requiring judgement stays with the `style-reviewer` agent.
 *
 *   node scripts/style-lint.js                 # every surface below
 *   node scripts/style-lint.js docs/tools      # a subtree
 *   node scripts/style-lint.js --warnings      # also fail on warnings
 *   node scripts/style-lint.js --json          # machine-readable
 *
 * Exit code 1 when there is at least one error (or any warning under --warnings).
 *
 * Everything below the SURFACES block is shared core, kept byte-identical with
 * `gorgo/scripts/style-lint.js`. Repo-specific choices go in SURFACES, not in the core.
 */

const fs = require('node:fs');
const path = require('node:path');
const rules = require('./style-rules');

// ─── SURFACES (repo-specific) ────────────────────────────────────────────────────────────────────

/** Checked when no path argument is given. */
const DEFAULT_ROOTS = ['docs', 'catalog', 'packages'];

/**
 * Path prefixes never read at all, for content that is downloaded or generated wholesale.
 * Nothing here: every surface in this repo is hand-written.
 */
const IGNORE = [];

// ─── SHARED CORE ─────────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Which file kinds we read, and the language each is written in.
 *
 * `lang` drives which rules apply: a Russian glossary rule must never fire on an English page.
 * `'any'` means the file holds both languages (a YAML catalog entry with `en:` and `ru:` keys).
 *
 * Deliberately an allowlist, not "every markdown file". A greedy match sweeps up generated content:
 * `CHANGELOG.md` is built from commit messages, and a vendored API client ships its own generated
 * `docs/*.md`. Failing a pull request over prose nobody on the team wrote is worse than missing a
 * rule. Adding a surface is a decision, not a side effect.
 */
function classify(filePath, name) {
  const posix = filePath.split(path.sep).join('/');

  // Bilingual page pair: docs/<topic>/{en,ru}.mdx, content/blog/<slug>/{en,ru}.mdx
  if (/^(en|ru)\.mdx?$/.test(name))
    return { lang: name.slice(0, 2), type: 'mdx' };

  // Locale catalogs, only inside an i18n or messages directory
  if (
    /^(en|ru)\.json$/.test(name) &&
    /(^|\/)(i18n|messages)(\/|$)/.test(path.dirname(posix))
  ) {
    return { lang: name.slice(0, 2), type: 'json' };
  }

  // Catalog entries and author lists
  if (name.endsWith('.yml') && !name.startsWith('.') && !name.startsWith('$')) {
    return { lang: 'any', type: 'yml' };
  }

  // Social post drafts: content/blog/<slug>/social/{telegram,discord}.md
  if (/(^|\/)social\/[a-z-]+\.md$/.test(posix))
    return { lang: 'any', type: 'md' };

  return null;
}

/** Paths whose content is generated or vendored, never hand-written by the team. */
const NEVER = [
  /(^|\/)CHANGELOG\.md$/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)\.medusa(\/|$)/,
  /(^|\/)\.turbo(\/|$)/,
  /(^|\/)openapi(\/|$)/,
  /-client\/docs\//,
];

function collect(root) {
  const abs = path.resolve(REPO_ROOT, root);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const push = (p) => {
    const posix = p.split(path.sep).join('/');
    if (NEVER.some((re) => re.test(posix))) return;
    const rel = path.relative(REPO_ROOT, p).split(path.sep).join('/');
    if (IGNORE.some((i) => rel === i || rel.startsWith(`${i}/`))) return;
    const c = classify(p, path.basename(p));
    if (c) out.push({ file: p, ...c });
  };
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name.startsWith('.')
        )
          continue;
        walk(p);
      } else push(p);
    }
  };
  fs.statSync(abs).isFile() ? push(abs) : walk(abs);
  return out;
}

/**
 * Blank out regions where the rules do not apply, preserving offsets so line numbers stay true:
 * frontmatter, fenced code, inline code, link targets, and MDX component attributes.
 */
function maskMarkdown(src) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  return src
    .replace(/^---\n[\s\S]*?\n---\n/, blank)
    .replace(/^```[\s\S]*?^```/gm, blank)
    .replace(/`[^`\n]*`/g, blank)
    .replace(/\]\([^)\n]*\)/g, blank)
    .replace(/<[A-Z][A-Za-z]*[^>]*>/g, blank);
}

/** In a locale catalog, only the string values are prose. Keys are identifiers. */
function maskJson(src) {
  return src.replace(/"(?:[^"\\\n]|\\.)*"(\s*:)?/g, (m, isKey) =>
    isKey ? m.replace(/[^\n]/g, ' ') : ` ${m.slice(1, -1)} `,
  );
}

/** In YAML, only the human-facing scalar values are prose. */
function maskYaml(src) {
  return src
    .split('\n')
    .map((line) => {
      const m = line.match(/^(\s*(?:-\s*)?[A-Za-z_][\w.-]*:\s*)(.*)$/);
      if (!m) return ' '.repeat(line.length);
      const [, prefix, value] = m;
      if (!value || /^[[{|>]/.test(value)) return ' '.repeat(line.length);
      return ' '.repeat(prefix.length) + value;
    })
    .join('\n');
}

const MASK = {
  mdx: maskMarkdown,
  md: maskMarkdown,
  json: maskJson,
  yml: maskYaml,
};

function lineOf(src, index) {
  return src.slice(0, index).split('\n').length;
}

function applies(rule, lang) {
  if (!rule.lang || rule.lang === 'any') return true;
  if (lang === 'any') return true; // the file holds both languages
  return rule.lang === lang;
}

const argv = process.argv.slice(2);
const failOnWarnings = argv.includes('--warnings');
const asJson = argv.includes('--json');
const roots = argv.filter((a) => !a.startsWith('--'));

const findings = [];

for (const root of roots.length ? roots : DEFAULT_ROOTS) {
  for (const { file, lang, type } of collect(root)) {
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(REPO_ROOT, file);
    const prose = MASK[type](src);
    const record = (rule, line, found) =>
      findings.push({
        file: rel,
        line,
        severity: rule.severity,
        id: rule.id,
        kind: rule.kind,
        found,
        fix: rule.fix,
      });

    for (const rule of rules.substring) {
      if (!applies(rule, lang)) continue;
      rule.re.lastIndex = 0;
      let m = rule.re.exec(prose);
      while (m !== null) {
        if (m[0].trim() === '') {
          rule.re.lastIndex = m.index + 1;
        } else {
          record(rule, lineOf(prose, m.index), m[0].trim());
          // A zero-length match would loop forever without advancing lastIndex by hand.
          if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
        }
        m = rule.re.exec(prose);
      }
    }

    if (type !== 'mdx' && type !== 'md') continue;

    let section = null;
    prose.split('\n').forEach((line, i) => {
      const m = line.match(/^(#{1,6})\s+(.*)$/);
      if (!m) return;
      const level = m[1].length;
      const text = m[2].trim();
      if (!text || text.startsWith('{frontmatter')) return;
      // The MDX renderer maps `#` to h2, so the page's top level is 1 in source and 2 on screen.
      if (level <= 2) section = text;
      const ctx = { level, section };
      for (const rule of rules.heading) {
        if (!applies(rule, lang)) continue;
        if (rule.test(text, ctx)) record(rule, i + 1, text);
      }
    });
  }
}

const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warn');

if (asJson) {
  console.log(JSON.stringify({ errors, warnings }, null, 2));
} else {
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  for (const [file, list] of [...byFile].sort()) {
    console.log(`\n${file}`);
    for (const f of list.sort((a, b) => a.line - b.line)) {
      const tag = f.severity === 'error' ? 'error' : 'warn ';
      console.log(
        `  ${tag} ${String(f.line).padStart(4)}  ${f.id.padEnd(20)} ${JSON.stringify(f.found).slice(0, 60)}`,
      );
      if (f.fix)
        console.log(`  ${' '.repeat(10)}  ${' '.repeat(20)} → ${f.fix}`);
    }
  }
  const counts = {};
  for (const f of findings) counts[f.id] = (counts[f.id] || 0) + 1;
  console.log(`\n${'─'.repeat(72)}`);
  console.log(
    `${errors.length} error(s), ${warnings.length} warning(s) across ${byFile.size} file(s)`,
  );
  if (findings.length) {
    console.log('\nby rule:');
    for (const [id, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)}  ${id}`);
    }
  }
}

process.exit(errors.length || (failOnWarnings && warnings.length) ? 1 : 0);
