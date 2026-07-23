import path from "node:path"
import { readFileSync } from "node:fs"
import type { ModuleProvider } from "@medusajs/framework/types"
import { parsePackageMeta } from "./package-meta"
import type { PackageMetaMap } from "../types"

/** Walk up from `startDir` to the nearest package.json that has name + version. */
function readNearestPackageJson(startDir: string): Record<string, unknown> | null {
  let dir = path.resolve(startDir)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const raw = readFileSync(path.join(dir, "package.json"), "utf-8")
      const pkg = JSON.parse(raw)
      if (pkg?.name && pkg?.version) return pkg
    } catch {
      // keep walking up
    }
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * Resolve npm-package metadata (version/author/url) per provider `identifier` from each
 * registration's `resolve` specifier. identifier↔package is 1:1, so one lookup keys every
 * instance sharing the class. Best-effort: an unresolvable provider is skipped, never thrown.
 */
export function resolvePackageMetaByIdentifier(providers: ModuleProvider[]): PackageMetaMap {
  const out: PackageMetaMap = {}
  for (const entry of providers) {
    const spec = (entry as { resolve?: string }).resolve
    if (!spec) continue
    try {
      const pkgJson = readNearestPackageJson(path.dirname(require.resolve(spec)))
      if (!pkgJson) continue
      const meta = parsePackageMeta(pkgJson as any)
      const mod = require(spec)
      const services: Array<{ identifier?: string }> = (mod?.default ?? mod)?.services ?? []
      for (const svc of services) {
        if (svc?.identifier) out[svc.identifier] = meta
      }
    } catch {
      // a single unresolvable provider must not sink the whole map
    }
  }
  return out
}
