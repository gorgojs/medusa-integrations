#!/usr/bin/env node
/**
 * Link checker for the MDX docs. Zero dependencies.
 *
 * Every link is resolved the way the docs site (gorgo/packages/docs) resolves it, so a link that
 * passes here works on docs.gorgojs.com:
 *
 *   - `/a/b` is the page docs/a/b/<locale>.mdx, in the locale of the page that links to it. A path
 *     that is only a directory with pages below it is a sidebar category, which the site redirects
 *     to its first page. A target whose frontmatter says `draft: true` still counts: the site
 *     renders the link as plain text in that locale until the page ships.
 *   - `#anchor` is the id rehype-slug (github-slugger) gives a heading of the target page in the
 *     same locale: an en.mdx needs the English slug, a ru.mdx the Cyrillic one. When the anchor
 *     exists only in the other language, the report names the one this language has.
 *   - `/static/...` lives in gorgo/packages/docs/public, another repository. With a sibling
 *     checkout the file is checked there and a miss is an error. Without one it is fetched from
 *     docs.gorgojs.com, and a miss is a warning, because the page and its screenshots reach the
 *     site through two pull requests that do not have to land in order.
 *   - A link into this repository on GitHub (`/blob/main/...`, `/tree/main/...`, a `#L12` line,
 *     an anchor into a Markdown file, raw.githubusercontent.com) is checked against the working
 *     tree, so a pull request that adds the file passes before it is merged.
 *   - Every other `http(s)://` link is fetched live: HEAD first, GET when the server rejects HEAD.
 *     404 and 410 are errors. 401, 403 and 429 are bot protection more often than a dead link, and
 *     5xx, timeouts and DNS failures are the network's day; those are warnings, retried once.
 *     A 301 or 308 is a warning naming the new address, because the old one works only for as
 *     long as the site keeps the redirect. A 302 or 307 is not reported: sites answer with one
 *     for a login, a locale or a CDN, and the link is right as written.
 *
 * Code fences, inline code and MDX comments are never read: a placeholder URL in an example is
 * not a link.
 *
 *   node scripts/check-docs-links.js                 # all of docs/, network included
 *   node scripts/check-docs-links.js docs/tools      # a subtree; links still resolve against docs/
 *   node scripts/check-docs-links.js --offline       # skip every fetch
 *   node scripts/check-docs-links.js --warnings      # also fail on warnings
 *   node scripts/check-docs-links.js --json          # machine-readable
 *
 * tbank.ru chains to the Russian Trusted Root CA, which Node does not ship. The script trusts the
 * copy in .github/certs itself, pinned by the fingerprint test.yml checks, so no environment
 * variable is needed. Node older than 24.5 lacks the API for it; set
 * NODE_EXTRA_CA_CERTS=.github/certs/root-ca.pem there instead.
 *
 * Exit code 1 when there is at least one error (or any warning under --warnings).
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');

// ─── SETTINGS ────────────────────────────────────────────────────────────────────────────────────

/** Where the docs are published. `/static/` assets are fetched from here without a checkout. */
const SITE = 'https://docs.gorgojs.com';

/** Links to this repository on GitHub are checked against the working tree instead of fetched. */
const THIS_REPO = 'gorgojs/medusa-integrations';

/**
 * The gorgo checkout holding `packages/docs/public/static`. The default is the sibling directory
 * this repo usually sits next to; DOCS_SITE_PUBLIC overrides it.
 */
const SITE_PUBLIC_DIR =
  process.env.DOCS_SITE_PUBLIC ||
  path.resolve(__dirname, '..', '..', 'gorgo', 'packages', 'docs', 'public');

/** URLs never fetched: local addresses and placeholders that prose may mention outside a fence. */
const SKIP_URL = [
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/,
  /^https?:\/\/([^/]+\.)?example\.(com|org|net)(\/|$)/,
  /^https?:\/\/[^/]*(your-|<|\{|%7B)/i,
];

/**
 * Hosts that answer a plain request with 403 but have an API that says 200 or 404 for the same
 * thing. The reader still opens the page; only the probe goes elsewhere.
 */
const PROBE_VIA = [
  [
    /^https:\/\/www\.npmjs\.com\/package\/(@[^/?#]+\/[^/?#]+|[^/?#@]+)/,
    'https://registry.npmjs.org/$1',
  ],
];

const LOCALES = ['en', 'ru'];
const USER_AGENT = `gorgo-docs-link-check (+https://github.com/${THIS_REPO})`;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 10;
/** Open requests at once, in total and against one host. GitHub answers 429 to a burst. */
const CONCURRENCY = 8;
const PER_HOST = 2;

// ─── ARGUMENTS ───────────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_ROOT = path.join(REPO_ROOT, 'docs');
const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const offline = argv.includes('--offline');
const failOnWarnings = argv.includes('--warnings');
const roots = argv
  .filter((a) => !a.startsWith('--'))
  .map((a) => path.resolve(REPO_ROOT, a));

/** The Russian Trusted Root CA, the copy and fingerprint test.yml and content.yml rely on. */
const EXTRA_CA = path.join(REPO_ROOT, '.github', 'certs', 'root-ca.pem');
const EXTRA_CA_SHA256 = 'D26D2D0231B7C39F92CC738512BA54103519E4405D68B5BD703E9788CA8ECF31';

function trustExtraCa() {
  if (typeof tls.setDefaultCACertificates !== 'function' || !fs.existsSync(EXTRA_CA)) return;
  const pem = fs.readFileSync(EXTRA_CA, 'utf8');
  const actual = new crypto.X509Certificate(pem).fingerprint256.replaceAll(':', '');
  if (actual !== EXTRA_CA_SHA256) {
    throw new Error(`unexpected SHA-256 fingerprint for ${EXTRA_CA}: ${actual}`);
  }
  tls.setDefaultCACertificates([...tls.getCACertificates('default'), pem]);
}

const findings = [];
function report(link, severity, check, detail) {
  findings.push({
    file: link.file,
    line: link.line,
    severity,
    check,
    target: link.target,
    detail,
  });
}

// ─── READING A PAGE ──────────────────────────────────────────────────────────────────────────────

/** Replace every character but newlines, so the text keeps its line numbers after masking. */
const blank = (s) => s.replace(/[^\n]/g, ' ');

function splitFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { front: '', body: src, offset: 0 };
  return {
    front: m[1],
    body: src.slice(m[0].length),
    offset: m[0].split('\n').length - 1,
  };
}

function frontmatterTitle(front) {
  const m = front.match(/^title:[ \t]*(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|(.*))[ \t]*$/m);
  if (!m) return '';
  return (m[1] ?? m[2] ?? m[3] ?? '').replace(/\\"/g, '"').trim();
}

/** Fenced code, masked. Inline code stays: a heading may name a symbol in backticks. */
function maskFences(body) {
  return body.replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm, blank);
}

function maskInline(body) {
  return body
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/``[^\n]*?``|`[^`\n]*`/g, blank);
}

/**
 * github-slugger, as rehype-slug applies it to a heading's text: lowercase, keep letters, digits,
 * marks, space, hyphen and underscore, turn spaces into hyphens. A repeated heading gets -1, -2.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M} _-]/gu, '')
    .replace(/ /g, '-');
}

/** The text content rehype-slug sees: no inline markup, `{frontmatter.title}` expanded. */
function headingText(raw, title) {
  return raw
    .replace(/\{frontmatter\.title\}/g, title)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*~]/g, '')
    .replace(/\s+#+\s*$/, '')
    .trim();
}

function headingSlugs(noFences, title) {
  const seen = new Map();
  const slugs = [];
  for (const line of noFences.split('\n')) {
    const m = line.match(/^ {0,3}(#{1,6})[ \t]+(.*)$/);
    if (!m) continue;
    const text = headingText(m[2], title);
    if (!text) continue;
    const base = slugify(text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    slugs.push(n ? `${base}-${n}` : base);
  }
  return slugs;
}

/** Ids that are not headings: explicit `id="…"` props and the ids MedusaTypeList gives rows. */
function componentIds(noCode) {
  const ids = [];
  for (const m of noCode.matchAll(/\bid="([^"]+)"/g)) ids.push(m[1]);
  // src/components/medusa-type-list/Items: `${sectionTitle}-${name}` with spaces as underscores
  for (const block of noCode.matchAll(/<MedusaTypeList\b[\s\S]*?(?:\/>|<\/MedusaTypeList>)/g)) {
    const section = block[0].match(/sectionTitle="([^"]*)"/)?.[1];
    if (!section) continue;
    for (const f of block[0].matchAll(/^\s*name:\s*"?([\w.[\]-]+)"?/gm)) {
      ids.push(`${section.replaceAll(' ', '_')}-${f[1].replaceAll(' ', '_')}`);
    }
  }
  return ids;
}

const MD_LINK =
  /!?\[(?:[^\[\]\\]|\\.|\[[^\]]*\])*\]\(\s*(?:<([^>]*)>|([^\s()<>]+(?:\([^\s()]*\))?))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
const ATTR_LINK = /\b(?:href|src|url|link)\s*[=:]\s*(?:"([^"]*)"|'([^']*)')/g;
const AUTOLINK = /<(https?:\/\/[^>\s]+)>/g;
const BARE_URL = /(?<![\w"'(<\[/=.@-])https?:\/\/[^\s<>"'`)\]]+/g;

function extractLinks(noCode, offset, file) {
  const links = [];
  const taken = [];
  const add = (m, target) => {
    if (!target) return;
    taken.push([m.index, m.index + m[0].length]);
    const line = offset + noCode.slice(0, m.index).split('\n').length;
    links.push({ file, line, target: target.trim() });
  };
  for (const m of noCode.matchAll(MD_LINK)) add(m, m[1] ?? m[2]);
  for (const m of noCode.matchAll(ATTR_LINK)) add(m, m[1] ?? m[2]);
  for (const m of noCode.matchAll(AUTOLINK)) add(m, m[1]);
  // GFM turns a bare URL into a link too, so it has to work as well.
  for (const m of noCode.matchAll(BARE_URL)) {
    if (taken.some(([a, b]) => m.index >= a && m.index < b)) continue;
    add(m, m[0].replace(/[.,;:!?)]+$/, ''));
  }
  return links;
}

function readPage(file, route) {
  const src = fs.readFileSync(file, 'utf8');
  const { front, body, offset } = splitFrontmatter(src);
  const title = frontmatterTitle(front);
  const noFences = maskFences(body);
  const noCode = maskInline(noFences);
  const headings = headingSlugs(noFences, title);
  return {
    file: path.relative(REPO_ROOT, file),
    route,
    locale: path.basename(file, '.mdx'),
    headings,
    anchors: new Set([...headings, ...componentIds(noCode)]),
    // The changelog is fetched from GitHub at build time; its version headings are not in source.
    anchorsUnknown: /<ChangelogRenderer\b/.test(noCode),
    links: extractLinks(noCode, offset, path.relative(REPO_ROOT, file)),
  };
}

// ─── THE SITE'S ROUTES ───────────────────────────────────────────────────────────────────────────

/** route → { en: page, ru: page }, for every directory under docs/ that holds a locale file. */
const routes = new Map();
(function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const rel = path.relative(DOCS_ROOT, dir).split(path.sep).join('/');
  const route = rel ? `/${rel}` : '/';
  for (const e of entries) {
    if (e.isFile() && /^(en|ru)\.mdx$/.test(e.name)) {
      if (!routes.has(route)) routes.set(route, {});
      routes.get(route)[e.name.slice(0, 2)] = readPage(path.join(dir, e.name), route);
    } else if (e.isDirectory() && !e.name.startsWith('.')) {
      walk(path.join(dir, e.name));
    }
  }
})(DOCS_ROOT);

const isCategory = (p) => [...routes.keys()].some((r) => r.startsWith(`${p}/`));

/**
 * For a missing page, up to three routes that end in the same segment, nearest first: the ones
 * sharing the most leading segments, then the one whose differing segment contains what was
 * written (`/1c/changelog` is usually `/1c-enterprise-catalog/changelog`).
 */
function similarRoutes(p) {
  const parts = p.split('/');
  const score = (r) => {
    const rp = r.split('/');
    let common = 0;
    while (common < parts.length && parts[common] === rp[common]) common++;
    const a = parts[common] ?? '';
    const b = rp[common] ?? '';
    return common * 2 + (a && b && (a.includes(b) || b.includes(a)) ? 1 : 0);
  };
  return [...routes.keys()]
    .filter((r) => r !== p && r.split('/').pop() === parts.at(-1))
    .sort((x, y) => score(y) - score(x) || x.localeCompare(y))
    .slice(0, 3);
}

const hasSitePublic = fs.existsSync(path.join(SITE_PUBLIC_DIR, 'static'));

// ─── INTERNAL LINKS ──────────────────────────────────────────────────────────────────────────────

function decode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function checkAnchor(link, target, locale, anchor) {
  const page = target[locale];
  if (page.anchorsUnknown || page.anchors.has(anchor)) return;
  const other = target[LOCALES.find((l) => l !== locale)];
  let hint = '';
  if (other?.anchors.has(anchor)) {
    const i = other.headings.indexOf(anchor);
    const own = i >= 0 && page.headings.length === other.headings.length ? page.headings[i] : null;
    hint = own
      ? `; this is the ${other.locale} anchor, the ${locale} page has #${own}`
      : `; this is the ${other.locale} anchor`;
  }
  report(link, 'error', 'missing-anchor', `no #${anchor} in ${page.file}${hint}`);
}

function checkInternal(link, from) {
  const raw = link.target;
  const [pathAndQuery, ...hashParts] = raw.split('#');
  const anchor = decode(hashParts.join('#'));
  let p = decode(pathAndQuery.split('?')[0]);

  if (p.length > 1 && p.endsWith('/')) {
    report(
      link,
      'warn',
      'trailing-slash',
      `the site serves ${p.slice(0, -1)}; the slash costs a redirect`,
    );
    p = p.slice(0, -1);
  }
  if (p === '/') return;

  const target = routes.get(p);
  if (!target) {
    if (isCategory(p)) {
      if (anchor) {
        report(
          link,
          'warn',
          'anchor-on-category',
          `${p} is a category that redirects to its first page; the anchor is lost`,
        );
      }
      return;
    }
    const similar = similarRoutes(p);
    const hint = similar.length ? `; did you mean ${similar.join(' or ')}` : '';
    report(link, 'error', 'missing-page', `no docs${p}/${from.locale}.mdx${hint}`);
    return;
  }

  const page = target[from.locale];
  if (!page) {
    const other = LOCALES.find((l) => target[l]);
    report(
      link,
      'error',
      'missing-locale',
      `the page exists only as ${other}.mdx; a ${from.locale} reader gets a 404`,
    );
    return;
  }
  if (anchor) checkAnchor(link, target, from.locale, anchor);
}

function checkAsset(link, external) {
  const rel = decode(link.target.split(/[?#]/)[0]);
  if (hasSitePublic) {
    if (!fs.existsSync(path.join(SITE_PUBLIC_DIR, rel))) {
      const where = path.relative(REPO_ROOT, SITE_PUBLIC_DIR);
      report(link, 'error', 'missing-asset', `not in ${where}${rel}`);
    }
    return;
  }
  // No checkout to look in: ask the site, and only warn, because the gorgo pull request that adds
  // the file may still be open.
  external.push({ link, url: `${SITE}${rel}`, severity: 'warn', check: 'asset-unpublished' });
}

// ─── LINKS INTO THIS REPOSITORY ON GITHUB ────────────────────────────────────────────────────────

/** The working-tree path a GitHub URL into this repo refers to; null when it has to be fetched. */
function repoTarget(url) {
  const u = new URL(url);
  const hash = decode(u.hash.slice(1));
  if (u.hostname === 'raw.githubusercontent.com') {
    const m = u.pathname.match(new RegExp(`^/${THIS_REPO}/(?:refs/heads/)?main/(.+)$`));
    return m ? { rel: decode(m[1]), hash } : null;
  }
  if (u.hostname !== 'github.com') return null;
  const p = u.pathname.replace(/\/$/, '');
  if (p === `/${THIS_REPO}`) return { rel: 'README.md', hash };
  // GitHub redirects a tree URL to a file and a blob URL to a directory, so the two are one check.
  const m = p.match(new RegExp(`^/${THIS_REPO}/(?:blob|tree)/main/(.+)$`));
  return m ? { rel: decode(m[1]), hash } : null;
}

function checkRepoLink(link, t) {
  const abs = path.resolve(REPO_ROOT, t.rel);
  if (!abs.startsWith(REPO_ROOT + path.sep) || !fs.existsSync(abs)) {
    report(link, 'error', 'missing-repo-path', `no ${t.rel} in the working tree`);
    return;
  }
  if (!t.hash || fs.statSync(abs).isDirectory()) return;

  const lines = fs.readFileSync(abs, 'utf8').split('\n');
  const range = t.hash.match(/^L(\d+)(?:-L(\d+))?$/);
  if (range) {
    const last = Number(range[2] ?? range[1]);
    if (last > lines.length) {
      report(link, 'error', 'missing-line', `${t.rel} has ${lines.length} lines, not ${last}`);
    }
    return;
  }
  if (/\.mdx?$/i.test(t.rel)) {
    // GitHub prefixes heading ids with user-content-, but the fragment itself is the plain slug.
    const slugs = headingSlugs(maskFences(splitFrontmatter(lines.join('\n')).body), '');
    if (!slugs.includes(t.hash)) {
      report(link, 'error', 'missing-anchor', `no heading #${t.hash} in ${t.rel}`);
    }
  }
}

// ─── EXTERNAL LINKS ──────────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PERMANENT = new Set([301, 308]);

/**
 * A redirect that only adds or swaps a language segment (`/support/x` to `/support/ru/x`) picks a
 * locale for this visitor; a reader elsewhere gets another one, so it is not a move. yandex.com
 * answers the same URL with a 301 to `/ru/` or a 302 to `/en/` depending on who asks.
 */
function onlyLocale(from, to) {
  const a = new URL(from);
  const b = new URL(to);
  if (a.host !== b.host) return false;
  const strip = (p) =>
    p
      .split('/')
      .filter((seg) => !/^[a-z]{2}(-[a-z]{2,4})?$/i.test(seg))
      .join('/');
  return strip(a.pathname) === strip(b.pathname);
}

/**
 * Follows redirects by hand to learn what `redirect: 'follow'` hides: whether the address moved.
 * `movedTo` is where the leading run of permanent redirects ends. A temporary hop stops it, so a
 * page that moved and then sends a visitor to a login suggests the page, not the login.
 */
async function request(url, method) {
  let current = url;
  let movedTo = null;
  let permanentRun = true;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(current, {
        method,
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*;q=0.8' },
      });
      const location = res.headers.get('location');
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      await res.body?.cancel();
      if (res.status < 300 || res.status >= 400 || !location) {
        return { status: res.status, retryAfter, movedTo };
      }
      const next = new URL(location, current).href;
      if (permanentRun && PERMANENT.has(res.status) && !onlyLocale(current, next)) movedTo = next;
      else permanentRun = false;
      current = next;
    }
    return { error: `more than ${MAX_REDIRECTS} redirects` };
  } catch (e) {
    return { error: e?.cause?.code || e?.name || String(e) };
  }
}

const HEAD_REJECTED = new Set([400, 403, 404, 405, 501]);

async function probe(url) {
  let r = await request(url, 'HEAD');
  if (r.error || HEAD_REJECTED.has(r.status)) r = await request(url, 'GET');
  if (r.error || r.status === 429 || r.status >= 500) {
    await sleep(Math.min(r.retryAfter || 3, 30) * 1000);
    r = await request(url, 'GET');
  }
  return r;
}

function verdict(r) {
  const warn = (check, detail) => ({ severity: 'warn', check, detail });
  if (r.error) return warn('unreachable', r.error);
  if ([401, 403, 405, 429].includes(r.status)) {
    return warn('blocked', `HTTP ${r.status}, likely bot protection`);
  }
  if (r.status >= 500) return warn('unreachable', `HTTP ${r.status}`);
  if (r.status < 400) {
    return r.movedTo ? warn('redirect', `moved permanently; link ${r.movedTo}`) : null;
  }
  return { severity: 'error', check: 'not-found', detail: `HTTP ${r.status}` };
}

function probeUrl(url) {
  for (const [re, to] of PROBE_VIA) if (re.test(url)) return url.replace(re, to);
  return url;
}

/** Fetch each URL once, at most PER_HOST at a time per host and CONCURRENCY overall. */
async function probeAll(urls) {
  const results = new Map();
  const byHost = new Map();
  for (const url of new Set(urls)) {
    const host = new URL(url).host;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(url);
  }
  let active = 0;
  const waiting = [];
  const acquire = () =>
    active < CONCURRENCY
      ? void active++
      : new Promise((r) => waiting.push(r)).then(() => void active++);
  const release = () => {
    active--;
    waiting.shift()?.();
  };
  await Promise.all(
    [...byHost.values()].map((queue) =>
      Promise.all(
        Array.from({ length: Math.min(PER_HOST, queue.length) }, async () => {
          while (queue.length) {
            const url = queue.shift();
            await acquire();
            try {
              results.set(url, await probe(url));
            } finally {
              release();
            }
          }
        }),
      ),
    ),
  );
  return results;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────────────────────────

async function main() {
  const pages = [...routes.values()]
    .flatMap((t) => LOCALES.map((l) => t[l]).filter(Boolean))
    .filter(
      (p) =>
        !roots.length ||
        roots.some((r) => path.resolve(REPO_ROOT, p.file).startsWith(r)),
    );

  // `own` is false when the probe goes somewhere else than the link, so its redirects are not news.
  const external = []; // { link, url, own?, severity?, check? }
  let total = 0;

  for (const page of pages) {
    for (const link of page.links) {
      total++;
      const t = link.target;
      if (t.startsWith('#')) {
        checkAnchor(link, routes.get(page.route), page.locale, decode(t.slice(1)));
      } else if (t.startsWith('//')) {
        external.push({ link, url: `https:${t}`, own: true });
      } else if (t.startsWith('/')) {
        if (t.startsWith('/static/')) checkAsset(link, external);
        else checkInternal(link, page);
      } else if (/^https?:\/\//i.test(t)) {
        const repo = repoTarget(t);
        if (repo) checkRepoLink(link, repo);
        else if (!SKIP_URL.some((re) => re.test(t))) {
          const url = t.split('#')[0];
          const probe = probeUrl(url);
          external.push({ link, url: probe, own: probe === url });
        }
      } else if (/^[a-z][a-z0-9+.-]*:/i.test(t)) {
        // mailto:, tel: and the like
      } else {
        report(
          link,
          'error',
          'relative-link',
          'internal links are absolute site-root paths, like /medusa-modules/integration',
        );
      }
    }
  }

  let fetched = 0;
  if (!offline && external.length) {
    trustExtraCa();
    const urls = [...new Set(external.map((e) => e.url))];
    fetched = urls.length;
    process.stderr.write(`fetching ${urls.length} external link(s)…\n`);
    const results = await probeAll(urls);
    for (const e of external) {
      const v = verdict(results.get(e.url) ?? { error: 'not probed' });
      if (!v || (v.check === 'redirect' && !e.own)) continue;
      // A `/static/` miss on the live site stays a warning; the asset may be in flight.
      if (e.check) report(e.link, e.severity, e.check, `${v.detail}; not on ${SITE} (yet)`);
      else report(e.link, v.severity, v.check, v.detail);
    }
  }

  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warn');
  const stats = {
    pages: pages.length,
    links: total,
    fetched,
    skipped: offline ? external.length : 0,
  };

  if (asJson) {
    console.log(JSON.stringify({ errors, warnings, stats }, null, 2));
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
        console.log(`  ${tag} ${String(f.line).padStart(4)}  ${f.check.padEnd(18)} ${f.target}`);
        console.log(`  ${' '.repeat(10)}  ${' '.repeat(18)} → ${f.detail}`);
      }
    }
    const counts = {};
    for (const f of findings) counts[f.check] = (counts[f.check] || 0) + 1;
    console.log(`\n${'─'.repeat(72)}`);
    console.log(
      `${errors.length} error(s), ${warnings.length} warning(s) across ${byFile.size} file(s); ` +
        `${stats.links} link(s) on ${stats.pages} page(s), ${fetched} fetched` +
        (offline ? `, ${stats.skipped} external skipped (--offline)` : ''),
    );
    if (findings.length) {
      console.log('\nby check:');
      for (const [id, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${String(n).padStart(4)}  ${id}`);
      }
    }
    // Inline annotations in the pull request's Files tab.
    if (process.env.GITHUB_ACTIONS === 'true') {
      const esc = (s) =>
        String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
      for (const f of findings) {
        const kind = f.severity === 'error' ? 'error' : 'warning';
        const where = `file=${f.file},line=${f.line},title=${f.check}`;
        console.log(`::${kind} ${where}::${esc(`${f.target}: ${f.detail}`)}`);
      }
    }
  }

  process.exit(errors.length || (failOnWarnings && warnings.length) ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
