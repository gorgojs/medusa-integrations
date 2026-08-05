import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const SRC = join(__dirname, "..", "..", "..")

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })

describe("no raw HTML injection in the package", () => {
  it("never uses dangerouslySetInnerHTML", () => {
    const offenders = walk(SRC)
      .filter((p) => /\.(ts|tsx)$/.test(p))
      .filter((p) => p !== __filename) // this file's own source names the banned API to grep for it
      .filter((p) => readFileSync(p, "utf8").includes("dangerouslySetInnerHTML"))
      .map((p) => p.slice(SRC.length + 1))

    expect(offenders).toEqual([])
  })
})
