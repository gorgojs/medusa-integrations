#!/usr/bin/env node
/**
 * Completeness gate for integration providers. Zero dependencies.
 *
 * A new integration has to be registered in several places, and every one of them is easy to forget
 * because none of them fails a build on its own. This checks them all.
 *
 *   node scripts/check-integration-complete.js
 *   node scripts/check-integration-complete.js payment-tkassa
 *   node scripts/check-integration-complete.js --json
 *
 * Exit code 1 on any error.
 *
 * ## The four names problem
 *
 * One integration lives under up to four different identifiers, and they do not derive from each
 * other:
 *
 *   package dir          catalog identifier   docs slug         npm package
 *   erp-1c               1c                   1c-enterprise     @gorgo/medusa-1c
 *   payment-tkassa       tkassa               t-kassa           @gorgo/medusa-payment-tkassa
 *   fulfillment-apiship  apiship              apiship           @gorgo/medusa-fulfillment-apiship
 *
 * So this script does not guess. It resolves the docs slug by finding which docs directory mentions
 * the provider's npm package name, which is unique across all six today, and it matches a catalog
 * entry by its `npm:` field rather than by any name.
 */

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const argv = process.argv.slice(2)
const asJson = argv.includes('--json')
const only = argv.filter(a => !a.startsWith('--'))

const rel = p => path.relative(REPO_ROOT, p)
const abs = (...p) => path.join(REPO_ROOT, ...p)
const exists = (...p) => fs.existsSync(abs(...p))
const readIf = (...p) => (exists(...p) ? fs.readFileSync(abs(...p), 'utf8') : null)

const problems = []
const add = (provider, check, detail) => problems.push({ provider, check, detail })

/** Providers are the directories under packages/providers that ship a package.json. */
function providers() {
  const dir = abs('packages', 'providers')
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && exists('packages', 'providers', e.name, 'package.json'))
    .map(e => e.name)
    .filter(name => !only.length || only.includes(name))
}

/** Every catalog entry, parsed just enough to match on npm and read its file references. */
function catalogEntries() {
  const dir = abs('catalog', 'integrations')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.yml') && f !== 'example.yml')
    .map(f => {
      const src = fs.readFileSync(path.join(dir, f), 'utf8')
      const field = name => {
        const m = src.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))
        return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
      }
      return {
        file: `catalog/integrations/${f}`,
        identifier: field('identifier'),
        npm: field('npm'),
        icon: field('icon'),
        docsUrl: field('docsUrl'),
      }
    })
}

/** Which docs directory documents this package. Resolved by content, not by name. */
function docsSlugFor(npmName) {
  const root = abs('docs', 'medusa-integrations')
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .filter(e => {
      const stack = [path.join(root, e.name)]
      while (stack.length) {
        const dir = stack.pop()
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, entry.name)
          if (entry.isDirectory()) stack.push(p)
          else if (entry.name.endsWith('.mdx') && fs.readFileSync(p, 'utf8').includes(npmName)) return true
        }
      }
      return false
    })
    .map(e => e.name)
}

const entries = catalogEntries()

for (const name of providers()) {
  const pkg = JSON.parse(readIf('packages', 'providers', name, 'package.json'))
  const npmName = pkg.name

  // 1. A standalone example project, used as the integration-test environment and by
  //    update-medusa-version.yml to verify a Medusa bump.
  if (!exists('examples', name)) {
    add(name, 'example', `examples/${name}/ is missing`)
  }

  // 2. Integration tests.
  if (!exists('integration-tests', name)) {
    add(name, 'integration-tests', `integration-tests/${name}/ is missing`)
  }

  // 3. Bilingual documentation, resolved by which docs directory mentions the npm package.
  const slugs = docsSlugFor(npmName)
  if (slugs.length === 0) {
    add(name, 'docs', `no directory under docs/medusa-integrations/ mentions ${npmName}`)
  } else if (slugs.length > 1) {
    add(name, 'docs', `${npmName} is mentioned by more than one docs directory: ${slugs.join(', ')}`)
  } else {
    const slug = slugs[0]
    for (const lang of ['en', 'ru']) {
      if (!exists('docs', 'medusa-integrations', slug, `${lang}.mdx`)) {
        add(name, 'docs', `docs/medusa-integrations/${slug}/${lang}.mdx is missing`)
      }
    }
    // Every existing integration has these two, and a reader needs both.
    for (const page of ['getting-started', 'changelog']) {
      if (!exists('docs', 'medusa-integrations', slug, page)) {
        add(name, 'docs', `docs/medusa-integrations/${slug}/${page}/ is missing`)
      }
    }
  }

  // 4. A catalog entry, but only for a provider built on the integration module. A provider that
  //    does not extend AbstractIntegrationProvider is not configurable from Admin, so it has
  //    nothing to show there. feed-yandex is the current example.
  const usesModule = usesIntegrationModule(name)
  const entry = entries.find(e => e.npm === npmName)

  if (usesModule && !entry) {
    add(name, 'catalog', `extends AbstractIntegrationProvider but no catalog entry has npm: ${npmName}`)
  }
  if (!usesModule && entry) {
    add(name, 'catalog', `has catalog entry ${entry.file} but does not extend AbstractIntegrationProvider`)
  }
  if (entry) {
    if (!entry.icon) {
      add(name, 'catalog', `${entry.file} has no icon:`)
    } else if (!exists('catalog', 'icons', entry.icon)) {
      add(name, 'catalog', `catalog/icons/${entry.icon} is missing, referenced by ${entry.file}`)
    }
    if (!entry.docsUrl) {
      // Without docsUrl the Admin install modal has no link to the documentation at all.
      add(name, 'catalog', `${entry.file} has no docsUrl:, so the Admin install modal has no docs link`)
    } else if (slugs.length === 1 && !entry.docsUrl.includes(`/${slugs[0]}`)) {
      add(name, 'catalog', `${entry.file} docsUrl points elsewhere than docs/medusa-integrations/${slugs[0]}`)
    }
  }
}

/** Does any source file in the provider extend AbstractIntegrationProvider. */
function usesIntegrationModule(name) {
  const root = abs('packages', 'providers', name, 'src')
  if (!fs.existsSync(root)) return false
  const stack = [root]
  while (stack.length) {
    const dir = stack.pop()
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) stack.push(p)
      else if (entry.name.endsWith('.ts') && fs.readFileSync(p, 'utf8').includes('AbstractIntegrationProvider')) {
        return true
      }
    }
  }
  return false
}

// The offline fallback Admin shows when gorgojs.com is unreachable is generated from the catalog.
// A stale one means merchants see an integration list that no longer matches the catalog.
const generated = abs('packages', 'modules', 'integration', 'src', 'lib', 'catalog.generated.ts')
if (fs.existsSync(generated) && !only.length) {
  const inputs = []
  const walk = dir => {
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      // Skip dotfiles. A .DS_Store that Finder rewrote would otherwise report the fallback as
      // stale forever, and nothing would make it green again.
      if (e.name.startsWith('.')) continue
      const p = path.join(dir, e.name)
      e.isDirectory() ? walk(p) : inputs.push(fs.statSync(p).mtimeMs)
    }
  }
  walk(abs('catalog'))
  const newest = inputs.length ? Math.max(...inputs) : 0
  if (newest > fs.statSync(generated).mtimeMs) {
    add('(catalog)', 'generated', `${rel(generated)} is older than catalog/. Run: cd packages/modules/integration && yarn catalog:gen`)
  }
}

if (asJson) {
  console.log(JSON.stringify({ problems }, null, 2))
} else {
  const byProvider = new Map()
  for (const p of problems) {
    if (!byProvider.has(p.provider)) byProvider.set(p.provider, [])
    byProvider.get(p.provider).push(p)
  }
  for (const [provider, list] of [...byProvider].sort()) {
    console.log(`\n${provider}`)
    for (const p of list) console.log(`  ${p.check.padEnd(18)} ${p.detail}`)
  }
  console.log(`\n${'─'.repeat(72)}`)
  console.log(problems.length
    ? `${problems.length} problem(s) across ${byProvider.size} provider(s)`
    : `all ${providers().length} providers registered everywhere they need to be`)
}

process.exit(problems.length ? 1 : 0)
