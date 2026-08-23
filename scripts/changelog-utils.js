import { execSync } from 'node:child_process';

export const SECTION_ORDER = [
  'highlights',
  'breaking',
  'feat',
  'fix',
  'perf',
  'refactor',
  'docs',
  'test',
  'revert',
  'chore',
  'deps',
  'other',
];

export const SECTION_TITLES = {
  highlights: 'Highlights',
  breaking: 'Breaking Changes',
  feat: 'Features',
  fix: 'Bug Fixes',
  perf: 'Performance',
  refactor: 'Refactoring',
  docs: 'Documentation',
  test: 'Tests',
  revert: 'Reverts',
  chore: 'Chores',
  deps: 'Dependencies',
  other: 'Other Changes',
};

const TYPE_TO_SECTION = {
  feat: 'feat',
  fix: 'fix',
  perf: 'perf',
  refactor: 'refactor',
  docs: 'docs',
  test: 'test',
  revert: 'revert',
  chore: 'chore',
  build: 'chore',
  ci: 'chore',
  style: 'chore',
};

const SHA_RE = /\/commit\/([0-9a-f]{7,40})/;
const SUBJECT_RE = /^(?<type>\w+)(?:\([^)]*\))?(?<breaking>!)?:/;

const typeCache = new Map();

export function gitSubject(sha) {
  try {
    return execSync(`git log -1 --format=%s%n%b ${sha}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

export function sectionForSha(sha) {
  if (typeCache.has(sha)) return typeCache.get(sha);
  const text = gitSubject(sha);
  let section = null;
  if (text) {
    const [subject, ...rest] = text.split('\n');
    const body = rest.join('\n');
    if (/^Highlight\s*$/im.test(body)) section = 'highlights';
    else {
      const m = subject.match(SUBJECT_RE);
      if (m) {
        const breaking = !!m.groups.breaking || /^BREAKING CHANGE:/m.test(body);
        section = breaking
          ? 'breaking'
          : (TYPE_TO_SECTION[m.groups.type.toLowerCase()] ?? 'other');
      }
    }
  }
  typeCache.set(sha, section);
  return section;
}

export function shaOf(bullet) {
  return (bullet.match(SHA_RE) || [])[1] ?? null;
}

const BULLET_RE =
  /^- (\[#\d+\]\([^)]*\) )?(\[`[0-9a-f]{7,40}`\]\([^)]*\) )?(?:Thanks (\[@[^\]]+\]\([^)]*\))! )?- ([\s\S]*)$/;

export function reformatBulletLine(line) {
  const m = line.match(BULLET_RE);
  if (!m)
    return line.replace(
      /^- Updated dependencies \[\]:/,
      '- Updated dependencies:',
    );
  const pr = m[1] ? m[1].trim() : null;
  const commit = m[2] ? m[2].trim() : null;
  const user = m[3] || null;
  const desc = m[4];
  const where = pr && commit ? `${pr} (${commit})` : pr || commit;
  let suffix = '';
  if (user && where) suffix = ` by ${user} in ${where}`;
  else if (user) suffix = ` by ${user}`;
  else if (where) suffix = ` in ${where}`;
  return `- ${desc}${suffix}`;
}

export function reformatChangelog(md) {
  return md
    .split('\n')
    .map((line) => (line.startsWith('- ') ? reformatBulletLine(line) : line))
    .join('\n');
}

export function parseChangelog(md) {
  const blocks = md.split(/\n(?=## )/);
  const header = blocks.shift() ?? '';
  return { header, blocks };
}

export function regroupChangelog(md, sectionFor) {
  const { header, blocks } = parseChangelog(md);
  return [header, ...blocks.map((b) => regroupBlock(b, sectionFor))].join('\n');
}

export function formatNewestBlock(md, sectionFor) {
  const { header, blocks } = parseChangelog(md);
  if (!blocks.length) return md;
  const [newest, ...rest] = blocks;
  return [
    header,
    regroupBlock(reformatChangelog(newest), sectionFor),
    ...rest,
  ].join('\n');
}

export function bullets(body) {
  const items = [];
  let cur = null;
  for (const line of body.split('\n')) {
    if (/^- /.test(line)) {
      if (cur !== null) items.push(cur);
      cur = line;
    } else if (/^#{1,6} /.test(line)) {
      if (cur !== null) {
        items.push(cur);
        cur = null;
      }
    } else if (cur !== null) {
      cur += '\n' + line;
    }
  }
  if (cur !== null) items.push(cur);
  return items.map((c) => c.replace(/\s+$/, '')).filter((c) => c.length);
}

export function regroupBlock(block, sectionFor) {
  const nl = block.indexOf('\n');
  const heading = nl === -1 ? block : block.slice(0, nl);
  const body = nl === -1 ? '' : block.slice(nl + 1);

  if (!SHA_RE.test(body) && !/^\s*- Updated dependencies/m.test(body))
    return block;

  const items = bullets(body);
  if (!items.length) return block;

  const buckets = {};
  for (const bullet of items) {
    let section = 'other';
    if (/^\s*- Updated dependencies/.test(bullet)) {
      section = 'deps';
    } else {
      const sha = shaOf(bullet);
      if (sha) section = sectionFor(sha) ?? 'other';
    }
    (buckets[section] ??= []).push(bullet);
  }

  const parts = [heading, ''];
  for (const section of SECTION_ORDER) {
    const group = buckets[section];
    if (!group?.length) continue;
    parts.push(`### ${SECTION_TITLES[section]}`, '');
    parts.push(group.join('\n\n'), '');
  }
  return parts.join('\n').replace(/\n+$/, '\n');
}
