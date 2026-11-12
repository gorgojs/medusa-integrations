import type { Logger, ModuleProvider } from "@medusajs/framework/types"
import { resolveProviderModules, type ResolvedProviderModule } from "./resolve-package-meta"

export type DuplicateIdentifier = {
  identifier: string
  /** Every provider module that declares the identifier, in registration order. */
  providers: Pick<ResolvedProviderModule, "spec" | "meta">[]
}

/**
 * Identifiers declared by more than one provider module. Instances of one provider resolve to the
 * same file, so two registrations of one provider with different `id`s are not a duplicate.
 */
export function findDuplicateIdentifiers(providers: ModuleProvider[]): DuplicateIdentifier[] {
  const byIdentifier = new Map<string, Map<string, ResolvedProviderModule>>()
  for (const mod of resolveProviderModules(providers)) {
    for (const identifier of mod.identifiers) {
      const modules = byIdentifier.get(identifier) ?? new Map<string, ResolvedProviderModule>()
      if (!modules.has(mod.entryPath)) modules.set(mod.entryPath, mod)
      byIdentifier.set(identifier, modules)
    }
  }
  return [...byIdentifier]
    .filter(([, modules]) => modules.size > 1)
    .map(([identifier, modules]) => ({
      identifier,
      providers: [...modules.values()].map(({ spec, meta }) => ({ spec, meta })),
    }))
}

export function duplicateIdentifierMessage(dup: DuplicateIdentifier): string {
  const who = dup.providers
    .map((p) => (p.meta.name && !p.spec.startsWith(p.meta.name) ? `${p.spec} (${p.meta.name})` : p.spec))
    .join(", ")
  return (
    `[integration] The identifier "${dup.identifier}" is declared by more than one provider: ${who}. ` +
    `Stored settings, package details and the license check are keyed by identifier, so these ` +
    `providers get mixed up. Integration Module 3.0 will refuse to start with a duplicate identifier. ` +
    `Give each provider its own identifier.`
  )
}

/**
 * Warn once per duplicate identifier. The logger is resolved only when there is something to say,
 * and a hint must never break loading.
 */
export function warnDuplicateIdentifiers(
  providers: ModuleProvider[],
  getLogger: () => Pick<Logger, "warn">
): void {
  try {
    const duplicates = findDuplicateIdentifiers(providers)
    if (!duplicates.length) return
    const logger = getLogger()
    for (const dup of duplicates) logger.warn(duplicateIdentifierMessage(dup))
  } catch {
    // never throw from a hint
  }
}
