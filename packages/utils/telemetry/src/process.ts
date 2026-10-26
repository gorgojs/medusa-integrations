import crypto from "node:crypto"

const PROCESS_KEY = Symbol.for("gorgo.process")

export interface ProcessIdentity {
  id: string
  started_at: number
}

function isIdentity(value: unknown): value is ProcessIdentity {
  const v = value as Partial<ProcessIdentity> | null | undefined
  return typeof v?.id === "string" && v.id.length > 0 && typeof v.started_at === "number"
}

export function processIdentity(): ProcessIdentity {
  const g = globalThis as Record<symbol, unknown>
  const existing = g[PROCESS_KEY]
  if (isIdentity(existing)) return existing
  const created: ProcessIdentity = {
    id: crypto.randomUUID(),
    started_at: Math.round(Date.now() - process.uptime() * 1000),
  }
  g[PROCESS_KEY] = created
  return created
}
