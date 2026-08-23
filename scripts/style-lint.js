#!/usr/bin/env node
/**
 * Style linter for Gorgo content. Zero dependencies.
 *
 * Checks the machine-decidable half of the `gorgo-voice` writing rules. Everything requiring
 * judgement stays with the `style-reviewer` agent.
 *
 *   node scripts/style-lint.js                 # docs/ and catalog/
 *   node scripts/style-lint.js docs/tools      # a subtree
 *   node scripts/style-lint.js --warnings      # also fail on warnings
 *   node scripts/style-lint.js --json          # machine-readable output
 *
 * Exit code 1 when there is at least one error (or any warning under --warnings).
 */

const fs = require('node:fs')
const path = require('node:path')
const rules = require('./style-rules')

const DEFAULT_ROOTS = ['docs', 'catalog', 'packages']
const REPO_ROOT = path.resolve(__dirname, '..')

const argv = process.argv.slice(2)
const failOnWarnings = argv.includes('--warnings')
const asJson = argv.includes('--json')
const roots = argv.filter(a => !a.startsWith('--'))

/** Every content file we know how to read, with the language it is written in. */
function collect(root) {
  const abs = path.resolve(REPO_ROOT, root)
  if (!fs.existsSync(abs)) return []
  const out = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
        walk(p)
      } else if (/^(en|ru)\.mdx$/.test(entry.name)) {
        out.push({ file: p, lang: entry.name.slice(0, 2), type: 'mdx' })
      } else if (entry.name.endsWith('.yml') && !entry.name.startsWith('.')) {
        out.push({ file: p, lang: 'any', type: 'yml' })
      } else if (/[/\\]admin[/\\]i18n[/\\]/.test(p) && /^(en|ru)\.json$/.test(entry.name)) {
        // Admin locale catalogs. Only en and ru have house rules; the other 31 locales
        // modules/integration ships are Medusa's own and are not ours to police.
        out.push({ file: p, lang: entry.name.slice(0, 2), type: 'json' })
      }
    }
  }
  const st = fs.statSync(abs)
  if (st.isFile()) {
    const name = path.basename(abs)
    if (/^(en|ru)\.mdx$/.test(name)) out.push({ file: abs, lang: name.slice(0, 2), type: 'mdx' })
    else if (name.endsWith('.yml')) out.push({ file: abs, lang: 'any', type: 'yml' })
  } else walk(abs)
  return out
}

/**
 * Blank out regions where the rules do not apply, preserving offsets so line numbers stay true:
 * fenced code, inline code, frontmatter, link targets, and MDX component attributes.
 */
function maskable(src) {
  let s = src
  const blank = m => m.replace(/[^\n]/g, ' ')
  s = s.replace(/^---\n[\s\S]*?\n---\n/, blank)          // frontmatter
  s = s.replace(/^```[\s\S]*?^```/gm, blank)              // fenced code
  s = s.replace(/`[^`\n]*`/g, blank)                      // inline code
  s = s.replace(/\]\([^)\n]*\)/g, blank)                  // link targets, keep anchor text
  s = s.replace(/<[A-Z][A-Za-z]*[^>]*>/g, blank)          // MDX component tags and their props
  return s
}

/**
 * In a locale catalog, only the string values are prose. Keys are identifiers and must never be
 * flagged. Offsets are preserved so reported line numbers stay true.
 */
function maskableJson(src) {
  return src.replace(/"(?:[^"\\\n]|\\.)*"(\s*:)?/g, (m, isKey) =>
    isKey ? m.replace(/[^\n]/g, ' ') : ` ${m.slice(1, -1)} `)
}

/** In YAML, only the human-facing scalar values are prose. */
function maskableYaml(src) {
  return src
    .split('\n')
    .map(line => {
      const m = line.match(/^(\s*(?:-\s*)?[A-Za-z_][\w.-]*:\s*)(.*)$/)
      if (!m) return ' '.repeat(line.length)
      const [, prefix, value] = m
      if (!value || /^[[{|>]/.test(value)) return ' '.repeat(line.length)
      return ' '.repeat(prefix.length) + value
    })
    .join('\n')
}

function lineOf(src, index) {
  return src.slice(0, index).split('\n').length
}

function applies(rule, lang) {
  if (rule.lang === 'any' || !rule.lang) return true
  if (lang === 'any') return true // YAML holds both languages in one file
  return rule.lang === lang
}

const findings = []

function lint({ file, lang, type }) {
  const src = fs.readFileSync(file, 'utf8')
  const rel = path.relative(REPO_ROOT, file)
  const prose =
    type === 'yml' ? maskableYaml(src) : type === 'json' ? maskableJson(src) : maskable(src)

  for (const rule of rules.substring) {
    if (!applies(rule, lang)) continue
    rule.re.lastIndex = 0
    let m
    while ((m = rule.re.exec(prose)) !== null) {
      if (m[0].trim() === '') { rule.re.lastIndex = m.index + 1; continue }
      findings.push({
        file: rel, line: lineOf(prose, m.index), severity: rule.severity,
        id: rule.id, kind: rule.kind, found: m[0].trim(), fix: rule.fix,
      })
      if (m.index === rule.re.lastIndex) rule.re.lastIndex++
    }
  }

  if (type !== 'mdx') return

  // Headings are read from the masked source so a fenced code comment is not mistaken for one.
  prose.split('\n').forEach((line, i) => {
    const m = line.match(/^(#{1,6})\s+(.*)$/)
    if (!m) return
    const text = m[2].trim()
    if (!text || text.startsWith('{frontmatter')) return
    for (const rule of rules.heading) {
      if (!applies(rule, lang)) continue
      if (rule.test(text)) {
        findings.push({
          file: rel, line: i + 1, severity: rule.severity,
          id: rule.id, kind: rule.kind, found: text, fix: rule.fix,
        })
      }
    }
  })
}

for (const root of roots.length ? roots : DEFAULT_ROOTS) {
  for (const f of collect(root)) lint(f)
}

const errors = findings.filter(f => f.severity === 'error')
const warnings = findings.filter(f => f.severity === 'warn')

if (asJson) {
  console.log(JSON.stringify({ errors, warnings }, null, 2))
} else {
  const byFile = new Map()
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, [])
    byFile.get(f.file).push(f)
  }
  for (const [file, list] of [...byFile].sort()) {
    console.log(`\n${file}`)
    for (const f of list.sort((a, b) => a.line - b.line)) {
      const tag = f.severity === 'error' ? 'error' : 'warn '
      console.log(`  ${tag} ${String(f.line).padStart(4)}  ${f.id.padEnd(20)} ${JSON.stringify(f.found).slice(0, 60)}`)
      if (f.fix) console.log(`  ${' '.repeat(6)}${' '.repeat(4)}  ${' '.repeat(20)} → ${f.fix}`)
    }
  }
  const counts = {}
  for (const f of findings) counts[f.id] = (counts[f.id] || 0) + 1
  console.log(`\n${'─'.repeat(72)}`)
  console.log(`${errors.length} error(s), ${warnings.length} warning(s) across ${byFile.size} file(s)`)
  if (findings.length) {
    console.log('\nby rule:')
    for (const [id, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)}  ${id}`)
    }
  }
}

process.exit(errors.length || (failOnWarnings && warnings.length) ? 1 : 0)
