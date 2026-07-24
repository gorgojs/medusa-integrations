import crypto from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"

export interface ProjectInfo {
  id: string
  hash: string
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = canonicalize(obj[k])
        return acc
      }, {})
  }
  return value
}

async function findProjectPackageJsonPath(startDir: string): Promise<string | undefined> {
  let dir = path.resolve(startDir)
  const sep = path.sep
  const nm = `${sep}node_modules${sep}`

  while (true) {
    const inNodeModules = dir.includes(nm) || dir.endsWith(`${sep}node_modules`)
    if (!inNodeModules) {
      const pkgPath = path.join(dir, "package.json")
      try {
        await readFile(pkgPath, "utf-8")
        return pkgPath
      } catch {
      }
    }
    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

export async function collectProjectInfo(
  startDir: string = process.cwd()
): Promise<ProjectInfo | undefined> {
  const pkgPath = await findProjectPackageJsonPath(startDir)
  if (!pkgPath) return undefined

  try {
    const raw = await readFile(pkgPath, "utf-8")
    const parsed = JSON.parse(raw) as { name?: unknown }
    const name = typeof parsed.name === "string" ? parsed.name : ""
    if (!name) return undefined

    const id = crypto.createHash("sha256").update(name).digest("hex")
    const canonical = JSON.stringify(canonicalize(parsed))
    const hash = crypto.createHash("sha256").update(canonical).digest("hex")

    return { id, hash }
  } catch {
    return undefined
  }
}
