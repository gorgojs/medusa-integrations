import { describe, expect, it } from "@jest/globals"
import { parsePackageMeta, authorFromScope } from "../package-meta"

describe("authorFromScope", () => {
  it("capitalizes the npm scope", () => {
    expect(authorFromScope("@gorgo/medusa-payment-tkassa")).toBe("Gorgo")
  })
  it("returns null for unscoped or blank names", () => {
    expect(authorFromScope("medusa-plugin")).toBeNull()
    expect(authorFromScope(null)).toBeNull()
  })
})

describe("parsePackageMeta", () => {
  it("reads name + version", () => {
    const m = parsePackageMeta({ name: "@gorgo/x", version: "1.2.3" })
    expect(m.name).toBe("@gorgo/x")
    expect(m.version).toBe("1.2.3")
  })

  it("parses a string author with a URL and derives nothing extra", () => {
    const m = parsePackageMeta({ name: "@gorgo/x", version: "1.0.0", author: "Gorgo <hi@gorgo.dev> (https://gorgo.dev)" })
    expect(m.author).toBe("Gorgo")
    expect(m.authorUrl).toBe("https://gorgo.dev")
  })

  it("parses an object author", () => {
    const m = parsePackageMeta({ name: "@gorgo/x", version: "1.0.0", author: { name: "Gorgo", url: "https://gorgo.dev" } })
    expect(m.author).toBe("Gorgo")
    expect(m.authorUrl).toBe("https://gorgo.dev")
  })

  it("falls back to scope-derived author and homepage URL when author is absent", () => {
    const m = parsePackageMeta({ name: "@gorgo/x", version: "1.0.0", homepage: "https://gorgo.dev/x" })
    expect(m.author).toBe("Gorgo")
    expect(m.authorUrl).toBe("https://gorgo.dev/x")
  })

  it("yields nulls when nothing is resolvable", () => {
    const m = parsePackageMeta({ name: "plain", version: "1.0.0" })
    expect(m.author).toBeNull()
    expect(m.authorUrl).toBeNull()
  })

  it("does not throw on a non-string author.name and falls back to scope-derived author", () => {
    const m = parsePackageMeta({ name: "@gorgo/x", version: "1.0.0", author: { name: 123 } as any })
    expect(m.author).toBe("Gorgo")
  })

  it("does not throw on a non-string homepage and yields a null authorUrl", () => {
    const m = parsePackageMeta({ name: "plain", version: "1.0.0", homepage: { url: "https://gorgo.dev" } as any })
    expect(m.authorUrl).toBeNull()
  })

  it("uses the object author's name with no url, falling back to homepage for authorUrl", () => {
    const m = parsePackageMeta({
      name: "@gorgo/x",
      version: "1.0.0",
      author: { name: "Gorgo" },
      homepage: "https://gorgo.dev/x",
    })
    expect(m.author).toBe("Gorgo")
    expect(m.authorUrl).toBe("https://gorgo.dev/x")
  })

  it("falls back to scope-derived author on an empty-string author", () => {
    const m = parsePackageMeta({ name: "@gorgo/x", version: "1.0.0", author: "" })
    expect(m.author).toBe("Gorgo")
  })
})
