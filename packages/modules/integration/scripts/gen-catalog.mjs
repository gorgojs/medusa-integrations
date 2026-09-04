// Regenerates src/lib/catalog.generated.ts from the repo-root catalog/ directory —
// the same entries the gorgojs.com scrapper reads, so the shipped offline fallback and the
// live API describe one catalog rather than two hand-synced copies.
//
// Run: cd packages/modules/integration && node scripts/gen-catalog.mjs
// (js-yaml is resolved from the hoisted monorepo root — no package.json dependency.)
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import jsyaml from "js-yaml"

const here = dirname(fileURLToPath(import.meta.url))
// scripts -> integration -> modules -> packages -> repo root
const catalogDir = join(here, "..", "..", "..", "..", "catalog")
const entriesDir = join(catalogDir, "integrations")
const outPath = join(here, "..", "src", "lib", "catalog.generated.ts")

const load = (p) => jsyaml.load(readFileSync(p, "utf8"))

/**
 * Icons are inlined as data URIs so the offline fallback is actually offline: the
 * `/api/plugin-icon` URL still needs gorgojs.com reachable from the admin's browser, so a
 * merchant who falls back to this catalog would otherwise see a list of broken images.
 *
 * Anything whose encoded form exceeds this budget keeps the URL instead. The cap is what makes
 * the budget self-enforcing — an oversized asset degrades one icon rather than bloating the
 * server bundle and every /admin/integrations/catalog response.
 */
const MAX_INLINE_BYTES = 16 * 1024

const MIME = { ".svg": "image/svg+xml", ".png": "image/png" }

/**
 * SVG goes in percent-encoded rather than base64 — base64 costs ~33% over the raw bytes, while
 * un-escaping the few characters that are legal literals in a data URI keeps it near parity.
 * `encodeURIComponent` covers every reserved character and all non-ASCII first, so nothing
 * structural can leak through.
 */
const encodeSvg = (raw) =>
  encodeURIComponent(raw.replace(/\s+/g, " ").trim())
    .replace(/%3D/g, "=")
    .replace(/%3A/g, ":")
    .replace(/%2F/g, "/")

const iconDataUri = (file) => {
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase()
  const mime = MIME[ext]
  if (!mime) return null
  const raw = readFileSync(join(catalogDir, "icons", file))
  const uri =
    ext === ".svg"
      ? `data:${mime},${encodeSvg(raw.toString("utf8"))}`
      : `data:${mime};base64,${raw.toString("base64")}`
  return uri.length <= MAX_INLINE_BYTES ? uri : null
}

/**
 * `slug` is not a catalog field — it is derived from the npm package name, so community
 * authors have one less thing to get wrong and it can never drift from `npm`.
 * `@gorgo/medusa-1c` -> `gorgo-medusa-1c`.
 */
const slugOf = (npm) => npm.replace(/^@/, "").replace(/\//g, "-")

const authors = load(join(catalogDir, "authors.yml"))
if (!Array.isArray(authors)) {
  throw new Error(`[gen-catalog] expected authors.yml to be a list, got ${typeof authors}`)
}
const authorNames = new Map(authors.map((a) => [a?.id, a?.name?.en]))

const skippedIcons = []

/**
 * Falls back to the host-served URL — the shape the live API returns — when the asset is
 * missing, an unsupported type, or too big to inline.
 */
const inlineIcon = (file, icon, slug) => {
  const url = `/api/plugin-icon?slug=${slug}`
  if (!icon) return url
  const uri = iconDataUri(icon)
  if (uri) return uri
  skippedIcons.push(`${file}: ${icon}`)
  return url
}

const files = readdirSync(entriesDir)
  .filter((f) => f.endsWith(".yml"))
  .sort()
if (!files.length) throw new Error(`[gen-catalog] no entries found in ${entriesDir}`)

const flat = files
  .map((file) => ({ file, entry: load(join(entriesDir, file)) }))
  // `active: false` covers the annotated example.yml template as well as any hidden entry.
  .filter(({ entry }) => entry?.active !== false)
  .map(({ file, entry }) => {
    if (!entry?.identifier) throw new Error(`[gen-catalog] ${file}: missing identifier`)
    if (!entry.npm) throw new Error(`[gen-catalog] ${file}: missing npm`)
    const slug = slugOf(entry.npm)
    const authorLocalized = authorNames.get(entry.author)
    if (!authorLocalized) {
      throw new Error(`[gen-catalog] ${file}: author "${entry.author}" is not in authors.yml`)
    }
    return {
      integrationId: entry.identifier,
      slug,
      npm: entry.npm,
      category: entry.category,
      author: entry.author,
      authorLocalized,
      label: entry.displayName?.en ?? entry.identifier,
      shortDescription: entry.shortDescription?.en ?? "",
      repository: entry.repository,
      ...(entry.docsUrl ? { docsUrl: entry.docsUrl } : {}),
      ...(entry.docsSnippet ? { docsSnippet: entry.docsSnippet } : {}),
      icon: inlineIcon(file, entry.icon, slug),
      ...(entry.tier === "pro" ? { tier: "pro" } : {}),
      stars: null,
      downloads: null,
    }
  })

const banner =
  "/* eslint-disable */\n" +
  "// AUTO-GENERATED from catalog/integrations/*.yml by scripts/gen-catalog.mjs.\n" +
  "// Do not edit by hand — run `node scripts/gen-catalog.mjs` to regenerate.\n"
const body =
  `import type { CatalogIntegration } from "../types"\n\n` +
  `export const FALLBACK_CATALOG: CatalogIntegration[] = ${JSON.stringify(flat, null, 2)}\n`

writeFileSync(outPath, banner + "\n" + body, "utf8")
console.log(`[gen-catalog] wrote ${flat.length} entries → ${outPath}`)
for (const skipped of skippedIcons) {
  console.warn(
    `[gen-catalog] icon not inlined, falling back to the hosted URL — ${skipped} ` +
      `(over ${MAX_INLINE_BYTES / 1024} KB encoded; offline admin will show no icon for it)`
  )
}
