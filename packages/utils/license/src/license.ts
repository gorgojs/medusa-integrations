import { packageFrom } from "./package-manifest"
import { processIdentity } from "./process"
import { runtimeOf } from "./runtime"
import type { HostSource } from "./runtime"
import { verifyUrls } from "./urls"

const TOKEN_RE = /^gorgo_live_[a-f0-9]{16,128}$/
const DEBOUNCE_MS = 2_000
const ATTEMPT_TIMEOUT_MS = 3_000
const TOTAL_BUDGET_MS = 6_000
const MAX_BODY_BYTES = 16 * 1024
const MAX_PACKAGES = 50
const RECHECK_MS = 24 * 60 * 60 * 1000
const RECHECK_SPREAD_MS = 60 * 60 * 1000
const RETRY_MS = 15 * 60 * 1000
const RETRY_SPREAD_MS = 5 * 60 * 1000

export type LicenseFailReason =
  | "missing"
  | "malformed"
  | "invalid_token"
  | "no_subscription"
  | "domain_not_allowed"
  | "version_after_cutoff"
  | "version_unverifiable"
  | "unknown"

export type LicenseStatus = "pending" | "ok" | "failed" | "unreachable"

export type LicenseProject = {
  handle: string
  name: string
  /** The project's key page in the Gorgo cabinet, where its domains and subscriptions are. */
  url?: string
}

export type LicenseSubscription = {
  ends_at: string | null
  cutoff: string | null
  /** Whether the subscription renews at `ends_at`. Absent when the platform does not say. */
  renews?: boolean
}

export type LicenseState = {
  state: LicenseStatus
  reason?: LicenseFailReason
  checkedAt?: number
  /** The backend's host this verdict was given for. */
  host?: string
  /** From the platform's reply, for the merchant's admin. */
  project?: LicenseProject
  /** `null` when the host is not in any of the project's environments. */
  environment?: { id: string; name: string } | null
  subscription?: LicenseSubscription
  latestAllowedVersion?: string | null
}

export type LicenseLogger = { warn(message: string): void; info(message: string): void }

/** Gets every package whose verdict changed, not only the caller's own. */
export type LicenseChangeListener = (
  packageName: string,
  next: LicenseState,
  previous?: LicenseState,
) => void

export type ConfigureLicenseInput = {
  /** Defaults to `GORGO_LICENSE`. */
  license?: string
  /** `configModule.admin.backendUrl`. `MEDUSA_BACKEND_URL` wins over it. */
  backendUrl?: string
  /** `configModule.projectConfig.workerMode`. Defaults to `MEDUSA_WORKER_MODE`. */
  workerMode?: string
  onChange?: LicenseChangeListener
  logger?: LicenseLogger
}

export type RegisterLicensedPackageInput = {
  /** The caller's `__dirname`. The name and version come from the nearest `package.json`. */
  packageDir?: string
  /** For a caller that registers another package, such as the integration module's loader. */
  packageName?: string
  packageVersion?: string
}

type PackageVerdict =
  | { ok: true; cutoff: string | null; endsAt: string | null; renews?: boolean; latestAllowedVersion: string | null }
  | { ok: false; reason: LicenseFailReason; cutoff: string | null; latestAllowedVersion: string | null }

type Verdict =
  | { ok: false; reason: LicenseFailReason }
  | {
      ok: true
      project?: LicenseProject
      environment?: { id: string; name: string } | null
      packages: Map<string, PackageVerdict>
    }

/** A verdict, an order to come back later (429), or `null` when the service did not answer. */
type Reply = { verdict: Verdict } | { retryAfterMs: number } | null

type Settings = { license?: string; backendUrl?: string; workerMode?: string; logger?: LicenseLogger }

/** `missing` and `malformed` describe the key and come only from the local check before any request. */
const KNOWN_REASONS: ReadonlySet<string> = new Set<LicenseFailReason>([
  "invalid_token",
  "no_subscription",
  "domain_not_allowed",
  "version_after_cutoff",
  "version_unverifiable",
])

const settings: Settings = {}
const listeners = new Set<LicenseChangeListener>()
/** Package name → version, for everything registered in this process. */
const packages = new Map<string, string | undefined>()
const states = new Map<string, LicenseState>()

let timer: ReturnType<typeof setTimeout> | undefined
let running: Promise<void> | undefined
let dirty = false
let generation = 0

function quietly(fn: () => void): void {
  try {
    fn()
  } catch {
    return
  }
}

function log(level: "warn" | "info", message: string): void {
  quietly(() => {
    if (settings.logger) settings.logger[level](message)
    else console[level](message)
  })
}

function urlHost(url: string | undefined): string | undefined {
  if (!url || url.startsWith("/")) return undefined
  try {
    return new URL(url).hostname || undefined
  } catch {
    return url
  }
}

/** The backend's host and where it came from. Medusa defaults `admin.backendUrl` to "/", which has none. */
function hostOf(): { host: string; source: HostSource } {
  const fromEnv = urlHost(process.env.MEDUSA_BACKEND_URL)
  if (fromEnv) return { host: fromEnv, source: "env" }
  const fromConfig = urlHost(settings.backendUrl)
  if (fromConfig) return { host: fromConfig, source: "config" }
  return { host: "localhost", source: "none" }
}

function licenseKey(): string {
  return (settings.license ?? process.env.GORGO_LICENSE ?? "").trim()
}

/** What a check depends on besides the packages, to tell whether new settings call for another. */
function fingerprint(): string {
  return [licenseKey(), hostOf().host, settings.workerMode ?? ""].join("\u0000")
}

function spread(baseMs: number, rangeMs: number): number {
  return Math.round(baseMs + (Math.random() * 2 - 1) * rangeMs)
}

function hint(reason: LicenseFailReason): string {
  switch (reason) {
    case "missing":
      return "GORGO_LICENSE is not set — copy the project key from the Gorgo cabinet"
    case "malformed":
      return "GORGO_LICENSE does not look like a project key (gorgo_live_…)"
    case "invalid_token":
      return "the key is unknown or was revoked — reissue it in the Gorgo cabinet"
    case "no_subscription":
      return "the project has no subscription for this package"
    case "domain_not_allowed":
      return "this backend's domain is not in the project's domain list"
    case "version_after_cutoff":
      return "this version was published after the subscription ended — renew it or pin an earlier version"
    case "version_unverifiable":
      return "the publish date of this version could not be confirmed against the ended subscription"
    default:
      return "the license service refused the key"
  }
}

function announce(name: string, next: LicenseState): void {
  if (next.state === "ok") {
    const cutoff = next.subscription?.cutoff
    log(
      "info",
      cutoff
        ? `[gorgo] ${name}: license confirmed for versions published up to ${cutoff.slice(0, 10)}.`
        : `[gorgo] ${name}: license confirmed.`,
    )
  } else if (next.state === "unreachable") {
    log("warn", `[gorgo] ${name}: could not reach the license service; will retry. The plugin keeps working.`)
  } else if (next.state === "failed" && next.reason) {
    log("warn", `[gorgo] ${name}: unlicensed — ${hint(next.reason)}. The plugin keeps working.`)
  }
}

function transition(name: string, next: LicenseState): void {
  const previous = states.get(name)
  states.set(name, next)
  if (previous?.state === next.state && previous?.reason === next.reason) return
  announce(name, next)
  for (const listener of listeners) quietly(() => listener(name, next, previous))
}

function reasonOf(value: unknown): LicenseFailReason {
  return typeof value === "string" && KNOWN_REASONS.has(value) ? (value as LicenseFailReason) : "unknown"
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

/** The admin renders the project link as is, so only an https address passes. */
function projectOf(value: unknown): LicenseProject | undefined {
  const v = value as { handle?: unknown; name?: unknown; url?: unknown } | null | undefined
  if (typeof v?.handle !== "string" || typeof v?.name !== "string") return undefined
  return typeof v.url === "string" && v.url.startsWith("https://")
    ? { handle: v.handle, name: v.name, url: v.url }
    : { handle: v.handle, name: v.name }
}

function environmentOf(value: unknown): { id: string; name: string } | null | undefined {
  if (value === null) return null
  const v = value as { id?: unknown; name?: unknown } | undefined
  return typeof v?.id === "string" && typeof v?.name === "string" ? { id: v.id, name: v.name } : undefined
}

function parseVerdict(raw: unknown): Verdict | null {
  if (!raw || typeof raw !== "object") return null
  const body = raw as Record<string, unknown>
  // The service's `malformed` means it could not read the request, which says nothing about the key.
  if (body.ok === false && body.reason === "malformed") return null
  if (body.ok === false) return { ok: false, reason: reasonOf(body.reason) }
  if (body.ok !== true || !Array.isArray(body.packages)) return null

  const verdicts = new Map<string, PackageVerdict>()
  for (const item of body.packages as Record<string, unknown>[]) {
    if (typeof item?.name !== "string") continue
    verdicts.set(
      item.name,
      item.ok === true
        ? {
            ok: true,
            cutoff: textOrNull(item.cutoff),
            endsAt: textOrNull(item.ends_at),
            ...(typeof item.renews === "boolean" ? { renews: item.renews } : {}),
            latestAllowedVersion: textOrNull(item.latest_allowed_version),
          }
        : {
            ok: false,
            reason: reasonOf(item.reason),
            cutoff: textOrNull(item.cutoff),
            latestAllowedVersion: textOrNull(item.latest_allowed_version),
          },
    )
  }
  return { ok: true, project: projectOf(body.project), environment: environmentOf(body.environment), packages: verdicts }
}

function retryAfterMs(header: string | null): number {
  const value = header?.trim() ?? ""
  const ms = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - Date.now()
  return Number.isFinite(ms) && ms > 0 ? Math.min(ms, RECHECK_MS) : spread(RETRY_MS, RETRY_SPREAD_MS)
}

async function readLimited(res: Response): Promise<string | null> {
  const reader = res.body?.getReader()
  if (!reader) return null
  const chunks: Buffer[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > MAX_BODY_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks).toString("utf8")
}

async function ask(url: string, body: unknown, timeoutMs: number): Promise<Reply> {
  try {
    const res = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    })
    if (res.status === 429) return { retryAfterMs: retryAfterMs(res.headers.get("retry-after")) }
    if (res.status >= 500) return null
    const text = await readLimited(res)
    if (text === null) return null
    const verdict = parseVerdict(JSON.parse(text))
    return verdict ? { verdict } : null
  } catch {
    return null
  }
}

/** The fallback address is tried only when the first one gives no answer, never after a 429. */
async function send(body: unknown): Promise<Reply> {
  const deadline = Date.now() + TOTAL_BUDGET_MS
  for (const url of verifyUrls()) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) break
    const reply = await ask(url, body, Math.min(ATTEMPT_TIMEOUT_MS, remaining))
    if (reply) return reply
  }
  return null
}

function refusal(entry: PackageVerdict | undefined, checkedAt: number, host: string): LicenseState {
  if (!entry || entry.ok) return { state: "failed", reason: "unknown", checkedAt, host }
  return {
    state: "failed",
    reason: entry.reason,
    checkedAt,
    host,
    ...(entry.cutoff ? { subscription: { ends_at: null, cutoff: entry.cutoff } } : {}),
    ...(entry.latestAllowedVersion ? { latestAllowedVersion: entry.latestAllowedVersion } : {}),
  }
}

function apply(names: string[], verdict: Verdict, checkedAt: number, host: string): void {
  if (!verdict.ok) {
    for (const name of names) transition(name, { state: "failed", reason: verdict.reason, checkedAt, host })
    return
  }
  const context: Pick<LicenseState, "project" | "environment"> = {
    ...(verdict.project ? { project: verdict.project } : {}),
    ...(verdict.environment !== undefined ? { environment: verdict.environment } : {}),
  }
  for (const name of names) {
    const entry = verdict.packages.get(name)
    transition(
      name,
      entry?.ok
        ? {
            state: "ok",
            checkedAt,
            host,
            ...context,
            subscription: {
              ends_at: entry.endsAt,
              cutoff: entry.cutoff,
              ...(entry.renews !== undefined ? { renews: entry.renews } : {}),
            },
            latestAllowedVersion: entry.latestAllowedVersion,
          }
        : { ...refusal(entry, checkedAt, host), ...context },
    )
  }
}

/** One check of every registered package. Returns when to check next, or nothing to wait for a change. */
async function run(gen: number): Promise<number | undefined> {
  const names = [...packages.keys()]
  if (!names.length) return undefined

  const license = licenseKey()
  if (!license || !TOKEN_RE.test(license)) {
    const reason = license ? "malformed" : "missing"
    for (const name of names) transition(name, { state: "failed", reason, checkedAt: Date.now() })
    return undefined
  }

  const batch = names.slice(0, MAX_PACKAGES)
  if (names.length > MAX_PACKAGES) {
    log("warn", `[gorgo] ${names.length} licensed packages registered; only the first ${MAX_PACKAGES} are checked.`)
  }
  const host = hostOf()
  const identity = processIdentity()
  const runtime = runtimeOf({ workerMode: settings.workerMode, hostSource: host.source, startedAt: identity.started_at })
  const reply = await send({
    license,
    host: host.host,
    instance: identity.id,
    runtime,
    packages: batch.map((name) => {
      const version = packages.get(name)
      return version ? { name, version } : { name }
    }),
  })
  if (gen !== generation) return undefined

  if (reply && "retryAfterMs" in reply) return reply.retryAfterMs

  const checkedAt = Date.now()
  if (!reply) {
    for (const name of batch) {
      const { reason: _reason, ...previous } = states.get(name) ?? { state: "pending" }
      transition(name, { ...previous, state: "unreachable", checkedAt })
    }
    return spread(RETRY_MS, RETRY_SPREAD_MS)
  }
  apply(batch, reply.verdict, checkedAt, host.host)
  return spread(RECHECK_MS, RECHECK_SPREAD_MS)
}

function schedule(delayMs: number): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void start(), Math.max(0, delayMs))
  timer.unref?.()
}

function start(): Promise<void> {
  if (running) return running
  if (timer) clearTimeout(timer)
  timer = undefined
  dirty = false

  const gen = generation
  const current = run(gen)
    .catch(() => undefined)
    .then((next) => {
      if (gen !== generation) return
      running = undefined
      if (dirty) schedule(DEBOUNCE_MS)
      else if (next !== undefined) schedule(next)
    })
  running = current
  return current
}

/** Debounced, so the packages registered while Medusa boots go out in one request. */
function requestCheck(): void {
  if (running) dirty = true
  else schedule(DEBOUNCE_MS)
}

/**
 * Settings for the process-wide check. Several callers may configure it: the first non-empty key,
 * backend URL, worker mode and logger win, and every `onChange` is kept.
 */
export function configureLicense(input: ConfigureLicenseInput): void {
  try {
    if (!input) return
    const before = fingerprint()

    const license = input.license?.trim()
    if (license && !settings.license) settings.license = license
    else if (license && settings.license !== license) {
      log("warn", "[gorgo] a different license key was configured for this process; the first one stays in use.")
    }
    if (input.backendUrl && !urlHost(settings.backendUrl)) settings.backendUrl = input.backendUrl
    if (input.workerMode && !settings.workerMode) settings.workerMode = input.workerMode
    if (input.logger && !settings.logger) settings.logger = input.logger
    if (typeof input.onChange === "function") listeners.add(input.onChange)

    if (packages.size && fingerprint() !== before) requestCheck()
  } catch {
    return
  }
}

/**
 * Adds a package to the process-wide check. The check never blocks and never throws: it runs in the
 * background two seconds after the last registration, then once a day. Returns the package name, so
 * the caller's `onChange` can tell its own verdicts from the others.
 */
export function registerLicensedPackage(input: RegisterLicensedPackageInput): string | undefined {
  try {
    const found = typeof input?.packageDir === "string" ? packageFrom(input.packageDir, input.packageName) : undefined
    const name = input?.packageName ?? found?.name
    if (!name) return undefined
    const version = input.packageVersion ?? found?.version
    if (packages.has(name) && packages.get(name) === version) return name

    packages.set(name, version)
    if (!states.has(name)) states.set(name, { state: "pending" })
    requestCheck()
    return name
  } catch {
    return undefined
  }
}

/** Checks right away, for "Check now" in the merchant's admin. Joins a check already running. */
export function recheckLicense(): Promise<void> {
  try {
    return packages.size ? start() : Promise.resolve()
  } catch {
    return Promise.resolve()
  }
}

export function licenseState(packageName: string): LicenseState | undefined {
  return states.get(packageName)
}

export function licenseStates(): Record<string, LicenseState> {
  return Object.fromEntries(states)
}

export function resetLicenseStatesForTests(): void {
  generation++
  if (timer) clearTimeout(timer)
  timer = undefined
  running = undefined
  dirty = false
  packages.clear()
  states.clear()
  listeners.clear()
  delete settings.license
  delete settings.backendUrl
  delete settings.workerMode
  delete settings.logger
}
