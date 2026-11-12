import { afterEach, describe, expect, it, jest } from "@jest/globals"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  duplicateIdentifierMessage,
  findDuplicateIdentifiers,
  warnDuplicateIdentifiers,
} from "../duplicate-identifiers"

/** A Medusa project with provider packages installed in its own node_modules. */
function projectWith(packages: Array<{ name: string; identifier: string }>): string {
  const root = mkdtempSync(path.join(tmpdir(), "gorgo-dup-"))
  for (const { name, identifier } of packages) {
    const dir = path.join(root, "node_modules", ...name.split("/"))
    mkdirSync(path.join(dir, "providers", identifier), { recursive: true })
    writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name, version: "1.0.0" }))
    writeFileSync(
      path.join(dir, "providers", identifier, "index.js"),
      `module.exports = { default: { services: [{ identifier: '${identifier}' }] } }`,
    )
  }
  return root
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe("findDuplicateIdentifiers", () => {
  it("reports one identifier declared by two packages, naming both", () => {
    jest.spyOn(process, "cwd").mockReturnValue(
      projectWith([
        { name: "@acme/crm", identifier: "crm" },
        { name: "@other/crm", identifier: "crm" },
      ]),
    )

    const dups = findDuplicateIdentifiers([
      { resolve: "@acme/crm/providers/crm" } as any,
      { resolve: "@other/crm/providers/crm" } as any,
    ])

    expect(dups).toHaveLength(1)
    expect(dups[0].identifier).toBe("crm")
    expect(dups[0].providers.map((p) => p.meta.name)).toEqual(["@acme/crm", "@other/crm"])
  })

  it("does not count two instances of one provider as a duplicate", () => {
    jest.spyOn(process, "cwd").mockReturnValue(projectWith([{ name: "@acme/crm", identifier: "crm" }]))

    expect(
      findDuplicateIdentifiers([
        { resolve: "@acme/crm/providers/crm", id: "eu" } as any,
        { resolve: "@acme/crm/providers/crm", id: "us" } as any,
      ]),
    ).toEqual([])
  })

  it("skips a provider it cannot resolve", () => {
    jest.spyOn(process, "cwd").mockReturnValue(projectWith([{ name: "@acme/crm", identifier: "crm" }]))

    expect(
      findDuplicateIdentifiers([
        { resolve: "@acme/crm/providers/crm" } as any,
        { resolve: "@missing/crm/providers/crm" } as any,
      ]),
    ).toEqual([])
  })
})

describe("warnDuplicateIdentifiers", () => {
  it("warns once per duplicate and says it becomes an error in 3.0", () => {
    jest.spyOn(process, "cwd").mockReturnValue(
      projectWith([
        { name: "@acme/crm", identifier: "crm" },
        { name: "@other/crm", identifier: "crm" },
      ]),
    )
    const warn = jest.fn()

    warnDuplicateIdentifiers(
      [{ resolve: "@acme/crm/providers/crm" } as any, { resolve: "@other/crm/providers/crm" } as any],
      () => ({ warn }) as any,
    )

    expect(warn).toHaveBeenCalledTimes(1)
    const message = String(warn.mock.calls[0][0])
    expect(message).toContain('"crm"')
    expect(message).toContain("@acme/crm/providers/crm")
    expect(message).toContain("@other/crm/providers/crm")
    expect(message).toContain("3.0")
  })

  it("does not resolve a logger when there is nothing to report", () => {
    jest.spyOn(process, "cwd").mockReturnValue(projectWith([{ name: "@acme/crm", identifier: "crm" }]))
    const getLogger = jest.fn(() => {
      throw new Error("no logger")
    })

    expect(() =>
      warnDuplicateIdentifiers([{ resolve: "@acme/crm/providers/crm" } as any], getLogger as any),
    ).not.toThrow()
    expect(getLogger).not.toHaveBeenCalled()
  })

  it("names a local provider by its path and a package provider by its specifier", () => {
    const message = duplicateIdentifierMessage({
      identifier: "crm",
      providers: [
        { spec: "./src/providers/crm", meta: { name: "my-store" } as any },
        { spec: "@acme/crm/providers/crm", meta: { name: "@acme/crm" } as any },
      ],
    })

    expect(message).toContain("./src/providers/crm (my-store), @acme/crm/providers/crm.")
  })
})
