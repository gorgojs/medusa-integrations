import { randomUUID } from "node:crypto"

/**
 * One id per process, shared with `@gorgo/telemetry`, which reads the same symbol for its
 * `session_id`. Whichever loads first creates it. The license check sends it as `instance`, so the
 * platform can tie a project to the telemetry of its processes without the key ever reaching
 * telemetry, and two copies of this library in one process report one process.
 */
const PROCESS_KEY = Symbol.for("gorgo.process")

export type ProcessIdentity = {
  id: string
  /** When the process started, ms since the epoch: the same whichever library got here first. */
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
    id: randomUUID(),
    started_at: Math.round(Date.now() - process.uptime() * 1000),
  }
  g[PROCESS_KEY] = created
  return created
}
