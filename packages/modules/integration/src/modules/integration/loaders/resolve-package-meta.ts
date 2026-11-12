import path from "node:path"
import { readFileSync } from "node:fs"
import type { ModuleProvider } from "@medusajs/framework/types"
import { parsePackageMeta } from "./package-meta"
import type { PackageMeta, PackageMetaMap } from "../types"

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
 * A provider shipped by a plugin is a bare specifier ("<plugin>/providers/<name>"), installed for
 * the project rather than for this module, so it resolves from the project directory first, the
 * way Medusa itself loads providers. Under pnpm without hoisting or Yarn PnP the module's own
 * location cannot see the plugin at all.
 */
function resolveFromProject(spec: string): string {
  try {
    return require.resolve(spec, { paths: [process.cwd()] })
  } catch {
    return require.resolve(spec)
  }
}

/** One provider registration, resolved to the file it loads and the package that ships it. */
export type ResolvedProviderModule = {
  /** The registration's `resolve` specifier, as written in medusa-config. */
  spec: string
  /** The file `spec` resolves to. Instances of one provider share it. */
  entryPath: string
  meta: PackageMeta
  identifiers: string[]
}

/**
 * Resolve every registration's `resolve` specifier to its file, its package metadata and the
 * identifiers its services declare. Best-effort: an unresolvable provider is skipped, never thrown.
 */
export function resolveProviderModules(providers: ModuleProvider[]): ResolvedProviderModule[] {
  const out: ResolvedProviderModule[] = []
  for (const entry of providers) {
    const spec = (entry as { resolve?: string }).resolve
    if (!spec) continue
    try {
      const entryPath = resolveFromProject(spec)
      const pkgJson = readNearestPackageJson(path.dirname(entryPath))
      if (!pkgJson) continue
      const meta = parsePackageMeta(pkgJson as any)
      const mod = require(entryPath)
      const services: Array<{ identifier?: string }> = (mod?.default ?? mod)?.services ?? []
      const identifiers = services.map((svc) => svc?.identifier).filter((id): id is string => !!id)
      out.push({ spec, entryPath, meta, identifiers })
    } catch {
      // a single unresolvable provider must not sink the whole list
    }
  }
  return out
}

/**
 * Resolve npm-package metadata (version/author/url) per provider `identifier`. One lookup keys
 * every instance sharing the class. When two packages declare one identifier the last one wins,
 * which `findDuplicateIdentifiers` reports.
 */
export function resolvePackageMetaByIdentifier(providers: ModuleProvider[]): PackageMetaMap {
  const out: PackageMetaMap = {}
  for (const mod of resolveProviderModules(providers)) {
    for (const identifier of mod.identifiers) out[identifier] = mod.meta
  }
  return out
}
