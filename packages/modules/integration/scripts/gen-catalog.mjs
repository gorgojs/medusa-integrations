// Regenerates src/lib/catalog.generated.ts from src/lib/integrations.yml.
// Run: cd packages/modules/integration && node scripts/gen-catalog.mjs
// (js-yaml is resolved from the hoisted monorepo root — no package.json dependency.)
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import jsyaml from "js-yaml"

const here = dirname(fileURLToPath(import.meta.url))
const ymlPath = join(here, "..", "src", "lib", "integrations.yml")
const outPath = join(here, "..", "src", "lib", "catalog.generated.ts")

const entries = jsyaml.load(readFileSync(ymlPath, "utf8"))
if (!Array.isArray(entries)) {
  throw new Error(`[gen-catalog] expected a YAML list, got ${typeof entries}`)
}

const titleCase = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

const flat = entries
  .filter((e) => e.active !== false)
  .map((e) => ({
    integrationId: e.integrationId,
    slug: e.slug,
    npm: e.npm,
    category: e.category,
    author: e.author,
    authorLocalized: titleCase(e.author),
    label: e.displayName?.en ?? e.integrationId,
    shortDescription: e.shortDescription?.en ?? "",
    repository: e.repository,
    docsUrl: e.docsUrl,
    ...(e.configSnippet ? { configSnippet: e.configSnippet } : {}),
    icon: `/api/plugin-icon?slug=${e.slug}`,
    stars: null,
    downloads: null,
  }))

const banner =
  "/* eslint-disable */\n" +
  "// AUTO-GENERATED from src/lib/integrations.yml by scripts/gen-catalog.mjs.\n" +
  "// Do not edit by hand — run `node scripts/gen-catalog.mjs` to regenerate.\n"
const body =
  `import type { CatalogIntegration } from "../types"\n\n` +
  `export const FALLBACK_CATALOG: CatalogIntegration[] = ${JSON.stringify(flat, null, 2)}\n`

writeFileSync(outPath, banner + "\n" + body, "utf8")
console.log(`[gen-catalog] wrote ${flat.length} entries → ${outPath}`)
