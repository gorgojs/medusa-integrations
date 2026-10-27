import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { FALLBACK_CATALOG } from "../catalog.generated"

// __tests__ -> lib -> src -> integration -> modules -> packages -> repo root
const entriesDir = join(__dirname, "..", "..", "..", "..", "..", "..", "catalog", "integrations")

/**
 * The ids gen-catalog.mjs would emit right now: every entry not marked `active: false`. Read
 * from the top-level keys rather than through js-yaml, which this package does not declare.
 */
const activeCatalogIds = (): string[] =>
  readdirSync(entriesDir)
    .filter((f) => f.endsWith(".yml"))
    .map((f) => readFileSync(join(entriesDir, f), "utf8"))
    .filter((yml) => !/^active:\s*false\s*$/m.test(yml))
    .map((yml) => yml.match(/^identifier:\s*["']?([^"'\s#]+)/m)?.[1] ?? "")
    .sort()

describe("FALLBACK_CATALOG (generated from catalog/integrations/*.yml)", () => {
  it("holds exactly the active catalog entries, so a stale catalog.generated.ts fails here", () => {
    const ids = FALLBACK_CATALOG.map((c) => c.integrationId).sort()
    expect(ids).toEqual(activeCatalogIds())
  })

  it("flattens the 1c entry to the CatalogIntegration shape", () => {
    const oneC = FALLBACK_CATALOG.find((c) => c.integrationId === "1c")!
    expect(oneC).toMatchObject({
      slug: "gorgo-store-medusa-erp-1c",
      npm: "@gorgo-store/medusa-erp-1c",
      category: "erp",
      author: "gorgo",
      authorLocalized: "Gorgo",
      label: "1C:Enterprise",
      stars: null,
      downloads: null,
    })
    // A paid integration has no public repository, so the entry carries none.
    expect(oneC.repository).toBeUndefined()
    // 1c.svg is small enough to inline, so the offline fallback carries the image itself
    // rather than a URL that would need gorgojs.com reachable.
    expect(oneC.icon.startsWith("data:image/svg+xml,")).toBe(true)
    expect(oneC.docsSnippet!.en).toContain("@gorgo-store/medusa-erp-1c")
    expect(oneC.docsSnippet!.ru).toContain("@gorgo-store/medusa-erp-1c")
  })

  it("keeps the free 1C edition apart from the paid one", () => {
    const catalog = FALLBACK_CATALOG.find((c) => c.integrationId === "1c-catalog")!
    expect(catalog).toMatchObject({
      slug: "gorgo-medusa-1c",
      npm: "@gorgo/medusa-1c",
      label: "1C:Enterprise Catalog",
      repository: "https://github.com/gorgojs/medusa-integrations",
    })
  })

  it("every entry is well-formed", () => {
    for (const c of FALLBACK_CATALOG) {
      expect(typeof c.integrationId).toBe("string")
      expect(c.integrationId.length).toBeGreaterThan(0)
      expect(typeof c.label).toBe("string")
      expect(c.label.length).toBeGreaterThan(0)
      // Either self-contained (inlined) or the hosted URL for an asset too big to inline —
      // never anything a browser could not load as an <img src>.
      expect(
        c.icon.startsWith("data:image/") || c.icon === `/api/plugin-icon?slug=${c.slug}`
      ).toBe(true)
      expect(c.stars).toBeNull()
      expect(c.downloads).toBeNull()
    }
  })
})
