import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { regroupChangelog, reformatChangelog, sectionForSha } from './changelog-utils.js'
import { resolveCommitAuthors } from './github-authors.js'

const REPO = process.env.GITHUB_REPOSITORY || 'gorgojs/medusa-integrations'
const TOKEN = process.env.GITHUB_TOKEN
const APPLY = process.argv.includes('--apply')
const DRY_OUT = process.env.DRY_OUT || '.'

const FILES = [
  'packages/providers/erp-1c/CHANGELOG.md',
  'packages/providers/feed-yandex/CHANGELOG.md',
  'packages/providers/fulfillment-apiship/CHANGELOG.md',
  'packages/providers/payment-robokassa/CHANGELOG.md',
  'packages/providers/payment-tkassa/CHANGELOG.md',
  'packages/providers/payment-yookassa/CHANGELOG.md',
  'packages/utils/telemetry/CHANGELOG.md',
]

const SHA_AUTHOR_RE = /\/commit\/([0-9a-f]{7,40})(\)[^\n]*?Thanks \[@)([^\]]+)(\]\()([^)]+)(\)!)/g

function fixAuthors(md, authors) {
  return md.replace(SHA_AUTHOR_RE, (full, sha, mid, oldLogin, open, oldUrl, close) => {
    const short = sha.slice(0, 7)
    const login = authors.get(sha) ?? authors.get(short)
    if (!login || login === oldLogin) return full
    return `/commit/${sha}${mid}${login}${open}https://github.com/${login}${close}`
  })
}

const present = FILES.filter(rel => existsSync(path.resolve(rel)))
const sources = new Map(present.map(rel => [rel, readFileSync(path.resolve(rel), 'utf8')]))

let authors = new Map()
if (!process.env.SKIP_AUTHORS && TOKEN) {
  const shas = [...sources.values()].flatMap(md => [...md.matchAll(/\/commit\/([0-9a-f]{7,40})/g)].map(m => m[1]))
  console.log(`Resolving authors for ${new Set(shas).size} commits via GraphQL...`)
  authors = await resolveCommitAuthors(shas, { repo: REPO, token: TOKEN })
} else {
  console.log('Skipping author resolution (no GITHUB_TOKEN or SKIP_AUTHORS set).')
}

let changed = 0
for (const [rel, original] of sources) {
  const authored = fixAuthors(original, authors)
  const rebuilt = regroupChangelog(reformatChangelog(authored), sectionForSha)

  if (rebuilt === original) {
    console.log(`unchanged: ${rel}`)
    continue
  }
  changed++
  if (APPLY) {
    writeFileSync(path.resolve(rel), rebuilt, 'utf8')
    console.log(`rewritten: ${rel}`)
  } else {
    const out = path.resolve(DRY_OUT, `${path.basename(path.dirname(path.resolve(rel)))}.CHANGELOG.new.md`)
    writeFileSync(out, rebuilt, 'utf8')
    console.log(`would rewrite: ${rel} -> ${out}`)
  }
}

console.log(`\n${APPLY ? 'Applied' : 'Dry-run'}: ${changed} file(s) ${APPLY ? 'rewritten' : 'differ'}.`)
