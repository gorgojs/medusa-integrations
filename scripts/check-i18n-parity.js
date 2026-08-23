#!/usr/bin/env node
/**
 * Key parity gate for i18n locale files. Zero dependencies.
 *
 * Named for i18n rather than "catalog": in this codebase a catalog is the integration catalog
 * (`medusa-integrations/catalog/`) or the site's plugin catalog (`plugins.yml`), and this script
 * checks neither. It reads translation files, whether next-intl `messages/` or i18next
 * `admin/i18n/`.
 *
 * A key missing from one locale falls back silently, which is the bug this catches. It also reports
 * an ICU argument that exists in one locale and not the other (the placeholder renders literally),
 * an empty value, and warns on a value that looks untranslated.
 *
 *   node scripts/check-i18n-parity.js
 *   node scripts/check-i18n-parity.js --json
 *   node scripts/check-i18n-parity.js --warnings   # also fail on warnings
 *
 * Exit code 1 on any error (or any warning under --warnings).
 *
 * Everything below the SURFACES block is shared core, kept byte-identical with
 * `gorgo/scripts/check-i18n-parity.js`. Repo-specific choices go in SURFACES, not in the core.
 */

// ─── SURFACES (repo-specific) ────────────────────────────────────────────────────────────────────

/**
 * Admin i18n catalogs. modules/integration ships 33 locales mirroring Medusa Admin's own set; the
 * providers ship en and ru only.
 */
const LOCALE_DIRS = [
  'packages/modules/integration/src/admin/i18n/json',
  'packages/providers/erp-1c/src/admin/i18n/json',
  'packages/providers/feed-yandex/src/admin/i18n/translations',
  'packages/providers/fulfillment-apiship/src/admin/i18n/json',
  'packages/providers/payment-robokassa/src/admin/i18n/json',
  'packages/providers/payment-tkassa/src/admin/i18n/json',
  'packages/providers/payment-yookassa/src/admin/i18n/json',
];

/** Locale every other one is compared against. */
const REFERENCE = 'en';

// ─── SHARED CORE ─────────────────────────────────────────────────────────────────────────────────

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const failOnWarnings = argv.includes('--warnings');

/** Flatten to `a.b.c` → value, so key sets compare regardless of nesting. */
function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

/**
 * The set of ICU argument names a message uses.
 *
 * Argument *names* only, never the sub-categories of a plural or select. Russian needs
 * `one/few/many/other` where English needs `one/other`, so differing categories are correct and must
 * not be reported.
 */
function placeholders(value) {
  if (typeof value !== 'string') return new Set();
  const names = new Set();
  for (const m of value.matchAll(/\{\s*([A-Za-z0-9_]+)\s*(?:,[^{}]*)?/g))
    names.add(m[1]);
  return names;
}

const findings = [];
const add = (severity, dir, key, check, detail) =>
  findings.push({ severity, dir, key, check, detail });

for (const dir of LOCALE_DIRS) {
  const abs = path.resolve(REPO_ROOT, dir);
  if (!fs.existsSync(abs)) {
    add('error', dir, '', 'missing-catalog', `${dir} does not exist`);
    continue;
  }

  const locales = fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.json') && !f.startsWith('$'))
    .map((f) => f.replace(/\.json$/, ''));

  if (!locales.includes(REFERENCE)) {
    add(
      'error',
      dir,
      '',
      'missing-reference',
      `${dir}/${REFERENCE}.json does not exist`,
    );
    continue;
  }

  const loaded = {};
  for (const loc of locales) {
    try {
      loaded[loc] = flatten(
        JSON.parse(fs.readFileSync(path.join(abs, `${loc}.json`), 'utf8')),
      );
    } catch (err) {
      add('error', dir, '', 'invalid-json', `${loc}.json: ${err.message}`);
    }
  }

  const ref = loaded[REFERENCE];
  if (!ref) continue;

  for (const loc of locales.filter((l) => l !== REFERENCE)) {
    const other = loaded[loc];
    if (!other) continue;

    for (const key of ref.keys()) {
      if (!other.has(key)) {
        add(
          'error',
          dir,
          key,
          'missing-key',
          `present in ${REFERENCE}, missing in ${loc}`,
        );
      }
    }
    for (const key of other.keys()) {
      if (!ref.has(key)) {
        add(
          'error',
          dir,
          key,
          'extra-key',
          `present in ${loc}, missing in ${REFERENCE}`,
        );
      }
    }

    for (const key of ref.keys()) {
      if (!other.has(key)) continue;
      const a = placeholders(ref.get(key));
      const b = placeholders(other.get(key));
      const onlyRef = [...a].filter((x) => !b.has(x));
      const onlyOther = [...b].filter((x) => !a.has(x));
      if (onlyRef.length || onlyOther.length) {
        const parts = [];
        if (onlyRef.length)
          parts.push(`only in ${REFERENCE}: ${onlyRef.join(', ')}`);
        if (onlyOther.length)
          parts.push(`only in ${loc}: ${onlyOther.join(', ')}`);
        add('error', dir, key, 'placeholder-mismatch', parts.join('; '));
      }
    }

    // Untranslated content. A short value identical across locales is usually a proper noun
    // (`Medusa`, `npm`, `GitHub`), so only flag longer strings, and only as a warning.
    for (const key of ref.keys()) {
      if (!other.has(key)) continue;
      const a = ref.get(key);
      const b = other.get(key);
      if (typeof a !== 'string' || typeof b !== 'string') continue;
      if (b.trim() === '') {
        add('error', dir, key, 'empty-value', `${loc} value is empty`);
        continue;
      }
      if (a === b && a.trim().split(/\s+/).length > 2) {
        add(
          'warn',
          dir,
          key,
          'untranslated',
          `${loc} value is identical to ${REFERENCE}: ${JSON.stringify(a).slice(0, 60)}`,
        );
      }
    }
  }
}

const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warn');

if (asJson) {
  console.log(JSON.stringify({ errors, warnings }, null, 2));
} else {
  const byDir = new Map();
  for (const f of findings) {
    if (!byDir.has(f.dir)) byDir.set(f.dir, []);
    byDir.get(f.dir).push(f);
  }
  for (const [dir, list] of [...byDir].sort()) {
    console.log(`\n${dir}`);
    for (const f of list) {
      const tag = f.severity === 'error' ? 'error' : 'warn ';
      console.log(`  ${tag} ${f.check.padEnd(21)} ${f.key || '(catalog)'}`);
      console.log(`  ${' '.repeat(6)}${' '.repeat(21)} ${f.detail}`);
    }
  }
  console.log(`\n${'─'.repeat(72)}`);
  console.log(
    findings.length
      ? `${errors.length} error(s), ${warnings.length} warning(s)`
      : 'all locale files in parity',
  );
}

process.exit(errors.length || (failOnWarnings && warnings.length) ? 1 : 0);
