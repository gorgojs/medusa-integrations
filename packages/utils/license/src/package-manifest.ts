import { readFileSync } from "node:fs"
import path from "node:path"

function readManifest(dir: string): { name?: unknown; version?: unknown } | null {
  try {
    return JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8"))
  } catch {
    return null
  }
}

/**
 * The nearest `package.json` above `dir` that has a name, or the one with this `name` when it is
 * given. A plugin's code lives in `.medusa/server/src/...`, a few levels below its manifest.
 */
export function packageFrom(dir: string, name?: string): { name: string; version?: string } | undefined {
  let current = path.resolve(dir)
  for (;;) {
    const manifest = readManifest(current)
    if (typeof manifest?.name === "string" && (!name || manifest.name === name)) {
      return typeof manifest.version === "string"
        ? { name: manifest.name, version: manifest.version }
        : { name: manifest.name }
    }
    const parent = path.dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}
