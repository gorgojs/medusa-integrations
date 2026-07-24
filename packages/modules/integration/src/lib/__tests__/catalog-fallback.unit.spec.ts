import { FALLBACK_CATALOG } from "../catalog.generated"

describe("FALLBACK_CATALOG (generated from integrations.yml)", () => {
  it("contains all five active integrations", () => {
    expect(FALLBACK_CATALOG).toHaveLength(5)
    const ids = FALLBACK_CATALOG.map((c) => c.integrationId).sort()
    expect(ids).toEqual(["1c", "apiship", "robokassa", "tkassa", "yookassa"])
  })

  it("flattens the 1c entry to the CatalogIntegration shape", () => {
    const oneC = FALLBACK_CATALOG.find((c) => c.integrationId === "1c")!
    expect(oneC).toMatchObject({
      slug: "gorgo-medusa-1c",
      npm: "@gorgo/medusa-1c",
      category: "erp",
      author: "gorgo",
      authorLocalized: "Gorgo",
      label: "1C:Enterprise",
      icon: "/api/plugin-icon?slug=gorgo-medusa-1c",
      stars: null,
      downloads: null,
    })
    expect(oneC.configSnippet).toContain("@gorgo/medusa-1c")
  })

  it("every entry is well-formed", () => {
    for (const c of FALLBACK_CATALOG) {
      expect(typeof c.integrationId).toBe("string")
      expect(c.integrationId.length).toBeGreaterThan(0)
      expect(typeof c.label).toBe("string")
      expect(c.label.length).toBeGreaterThan(0)
      expect(c.icon).toBe(`/api/plugin-icon?slug=${c.slug}`)
      expect(c.stars).toBeNull()
      expect(c.downloads).toBeNull()
    }
  })
})
