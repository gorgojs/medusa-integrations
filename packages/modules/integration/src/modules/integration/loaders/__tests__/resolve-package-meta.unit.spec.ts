import { afterEach, describe, expect, it, jest } from "@jest/globals"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { resolvePackageMetaByIdentifier } from "../resolve-package-meta"

/** A Medusa project with one provider package installed in its own node_modules. */
function projectWithProvider(): string {
  const root = mkdtempSync(path.join(tmpdir(), "gorgo-project-"))
  const pkg = path.join(root, "node_modules", "@acme", "paid")
  mkdirSync(path.join(pkg, "providers", "thing"), { recursive: true })
  writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ name: "@acme/paid", version: "1.2.3" }))
  writeFileSync(
    path.join(pkg, "providers", "thing", "index.js"),
    "module.exports = { default: { services: [{ identifier: 'thing' }] } }",
  )
  return root
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe("resolvePackageMetaByIdentifier", () => {
  it("finds a provider package installed in the project, not next to this module", () => {
    const root = projectWithProvider()
    jest.spyOn(process, "cwd").mockReturnValue(root)

    const meta = resolvePackageMetaByIdentifier([{ resolve: "@acme/paid/providers/thing" } as any])

    expect(meta.thing).toMatchObject({
      name: "@acme/paid",
      version: "1.2.3",
      dir: path.join(root, "node_modules", "@acme", "paid"),
    })
  })

  it("skips a provider it cannot resolve", () => {
    jest.spyOn(process, "cwd").mockReturnValue(mkdtempSync(path.join(tmpdir(), "gorgo-empty-")))

    expect(resolvePackageMetaByIdentifier([{ resolve: "@acme/missing/providers/thing" } as any])).toEqual({})
  })
})
