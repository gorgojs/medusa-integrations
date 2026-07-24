import crypto from "node:crypto"
import { getMachineId, isTelemetryEnabled, setTelemetryEnabled } from "./config-store.js"
import { collectEnvInfo, findPackageJson } from "./env.js"
import { maybeShowFirstRunNotice } from "./notice.js"
import { collectProjectInfo, type ProjectInfo } from "./project.js"
import {
  severityForEvent,
  toOtlpAttributes,
  type OtlpAttribute,
  type OtlpLogRecord,
  type OtlpLogsPayload,
} from "./otlp.js"
import type { EnvInfo, PackageInfo } from "./types.js"

const TELEMETRY_ENDPOINT = "https://telemetry.gorgojs.com"
const VERBOSE =
  process.env.GORGO_TELEMETRY_VERBOSE === "1" || process.env.GORGO_TELEMETRY_VERBOSE === "true"
const FALLBACK_SCOPE = { name: "@gorgo/telemetry", version: "0.0.0" }
const DISPATCHER_KEY = Symbol.for("@gorgo/telemetry/dispatcher@v1")

function getScope(): Promise<{ name: string; version: string }> {
  let scopePromise: Promise<{ name: string; version: string }> | undefined
  if (!scopePromise) {
    scopePromise = findPackageJson(__dirname)
      .then((pkg) => pkg ?? FALLBACK_SCOPE)
      .catch(() => FALLBACK_SCOPE)
  }
  return scopePromise
}

export interface DispatcherOptions {
  endpoint?: string
  flushAt?: number
  flushInterval?: number
  maxQueueSize?: number
  pingInterval?: number
}

const DEFAULT_PING_INTERVAL_MS = 6 * 60 * 60 * 1000

interface QueuedEvent {
  eventName: string
  timeUnixNano: string
  properties: Record<string, unknown>
}

interface PackageBucket {
  pkg: PackageInfo
  events: QueuedEvent[]
}

function fallbackEnv(): EnvInfo {
  return {
    medusa_version: "0.0.0",
    node_version: process.version,
    os: process.platform,
    arch: process.arch,
    ci: false,
    container: false,
    node_env: process.env.NODE_ENV ?? "development",
    locale: "C",
    timezone: "UTC",
    package_manager: "unknown",
  }
}

export class TelemetryDispatcher {
  private readonly endpoint: string
  private readonly flushAt: number
  private readonly flushInterval: number
  private readonly maxQueueSize: number
  private readonly sessionId: string

  private buckets = new Map<string, PackageBucket>()
  private totalCount = 0
  private timer?: ReturnType<typeof setTimeout>

  private envCache?: EnvInfo
  private machineIdCache?: string
  private telemetryEnabledCache?: boolean
  private projectCache?: ProjectInfo | null

  private flushing = false
  private exitHandlersRegistered = false

  private lastNano = 0n

  private registeredPackages = new Map<string, PackageInfo>()
  private packageProperties = new Map<string, Record<string, unknown>>()
  private readonly pingInterval: number
  private readonly startedAt = Date.now()
  private pingIndex = 0
  private pingTimer?: ReturnType<typeof setInterval>
  private firstFlush = true

  private nextTimeUnixNano(): string {
    const candidate = BigInt(Date.now()) * 1_000_000n
    this.lastNano = candidate > this.lastNano ? candidate : this.lastNano + 1n
    return this.lastNano.toString()
  }

  constructor(options: DispatcherOptions = {}) {
    this.endpoint = process.env.GORGO_TELEMETRY_ENDPOINT ?? options.endpoint ?? TELEMETRY_ENDPOINT
    this.flushAt = Math.max(options.flushAt ?? 20, 1)
    this.flushInterval = options.flushInterval ?? 10_000
    this.maxQueueSize = Math.max(options.maxQueueSize ?? 1000, 1)
    this.pingInterval = options.pingInterval ?? DEFAULT_PING_INTERVAL_MS
    this.sessionId = crypto.randomUUID()

    this.registerExitHandlers()
    maybeShowFirstRunNotice()
  }

  private async getEnvInfo(): Promise<EnvInfo> {
    if (!this.envCache) {
      try {
        this.envCache = await collectEnvInfo()
      } catch (err) {
        if (VERBOSE) console.warn("[gorgo/telemetry] env collection failed:", err)
        this.envCache = fallbackEnv()
      }
    }
    return this.envCache
  }

  private getMachineIdCached(): string {
    if (this.machineIdCache === undefined) {
      try {
        this.machineIdCache = getMachineId()
      } catch {
        this.machineIdCache = ""
      }
    }
    return this.machineIdCache
  }

  private isEnabledCached(): boolean {
    if (this.telemetryEnabledCache === undefined) {
      try {
        this.telemetryEnabledCache = isTelemetryEnabled()
      } catch {
        this.telemetryEnabledCache = true
      }
    }
    return this.telemetryEnabledCache
  }

  private async getProjectInfoCached(): Promise<ProjectInfo | null> {
    if (this.projectCache === undefined) {
      try {
        const info = await collectProjectInfo()
        this.projectCache = info ?? null
      } catch (err) {
        if (VERBOSE) console.warn("[gorgo/telemetry] project info collection failed:", err)
        this.projectCache = null
      }
    }
    return this.projectCache
  }

  registerPackage(pkg: PackageInfo): void {
    try {
      const key = `${pkg.name}@${pkg.version}`
      if (this.registeredPackages.has(key)) return
      this.registeredPackages.set(key, pkg)
      this.armPingTimer()
    } catch (err) {
      if (VERBOSE) console.warn("[gorgo/telemetry] registerPackage failed:", err)
    }
  }

  private armPingTimer(): void {
    if (this.pingTimer || this.pingInterval <= 0) return
    this.pingTimer = setInterval(() => this.emitPing(), this.pingInterval)
    this.pingTimer.unref?.()
  }

  private emitPing(): void {
    try {
      this.pingIndex++
      const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000)
      for (const [key, pkg] of this.registeredPackages) {
        this.enqueue(pkg, "plugin.ping", {
          ...(this.packageProperties.get(key) ?? {}),
          uptime_seconds: uptimeSeconds,
          ping_index: this.pingIndex,
        })
      }
    } catch (err) {
      if (VERBOSE) console.warn("[gorgo/telemetry] emitPing failed:", err)
    }
  }

  enqueue(pkg: PackageInfo, eventName: string, properties: Record<string, unknown> = {}): void {
    try {
      if (!this.firstFlush && !this.isEnabledCached()) return

      const key = `${pkg.name}@${pkg.version}`

      if (eventName !== "plugin.ping" && Object.keys(properties).length > 0) {
        const existing = this.packageProperties.get(key) ?? {}
        this.packageProperties.set(key, { ...existing, ...properties })
      }

      let bucket = this.buckets.get(key)
      if (!bucket) {
        bucket = { pkg, events: [] }
        this.buckets.set(key, bucket)
      }

      bucket.events.push({
        eventName,
        timeUnixNano: this.nextTimeUnixNano(),
        properties,
      })
      this.totalCount++

      if (this.totalCount > this.maxQueueSize) {
        this.dropOldest()
      }

      if (VERBOSE) {
        console.log(
          `[gorgo/telemetry] queued: ${eventName} for ${pkg.name} (total: ${this.totalCount})`
        )
      }

      if (this.totalCount >= this.flushAt) {
        void this.flush()
      } else if (!this.timer) {
        this.timer = setTimeout(() => void this.flush(), this.flushInterval)
      }
    } catch (err) {
      if (VERBOSE) console.warn("[gorgo/telemetry] enqueue failed:", err)
    }
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }

    if (this.flushing) return
    if (this.totalCount === 0) return

    if (!this.firstFlush && !this.isEnabledCached()) {
      this.buckets.clear()
      this.totalCount = 0
      return
    }

    this.flushing = true
    this.firstFlush = false

    const inflight = this.buckets
    const inflightCount = this.totalCount
    this.buckets = new Map()
    this.totalCount = 0

    try {
      const [env, scope, project] = await Promise.all([
        this.getEnvInfo(),
        getScope(),
        this.getProjectInfoCached(),
      ])
      const machineId = this.getMachineIdCached()

      const resourceLogs = Array.from(inflight.values()).map((bucket) => ({
        resource: {
          attributes: this.buildResourceAttributes(bucket.pkg, env, machineId, project),
        },
        scopeLogs: [
          {
            scope: { name: scope.name, version: scope.version },
            logRecords: bucket.events.map((e) => this.toLogRecord(e)),
          },
        ],
      }))

      const payload: OtlpLogsPayload = { resourceLogs }
      const url = `${this.endpoint}/batch`

      if (VERBOSE) {
        console.log(
          `[gorgo/telemetry] flushing ${inflightCount} event(s) across ${resourceLogs.length} package(s) to ${url}`
        )
      }

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5_000),
      })
    } catch (err) {
      if (VERBOSE) console.warn("[gorgo/telemetry] flush failed:", err)
      this.requeue(inflight)
    } finally {
      this.flushing = false
      if (this.totalCount > 0 && !this.timer) {
        this.timer = setTimeout(() => void this.flush(), this.flushInterval)
      }
    }
  }

  setEnabled(enabled: boolean): void {
    try {
      setTelemetryEnabled(enabled)
      this.telemetryEnabledCache = enabled
    } catch (err) {
      if (VERBOSE) console.warn("[gorgo/telemetry] setEnabled failed:", err)
    }
  }

  isEnabled(): boolean {
    return this.isEnabledCached()
  }

  __resetForTesting(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = undefined
    }
    this.buckets.clear()
    this.totalCount = 0
    this.envCache = undefined
    this.machineIdCache = undefined
    this.telemetryEnabledCache = undefined
    this.projectCache = undefined
    this.flushing = false
    this.registeredPackages.clear()
    this.packageProperties.clear()
    this.pingIndex = 0
  }

  private registerExitHandlers(): void {
    if (this.exitHandlersRegistered) return
    this.exitHandlersRegistered = true

    process.once("beforeExit", () => {
      try {
        void this.flush()
      } catch {
      }
    })
  }

  private dropOldest(): void {
    let victim: PackageBucket | undefined
    let maxLen = 0
    for (const bucket of this.buckets.values()) {
      if (bucket.events.length > maxLen) {
        maxLen = bucket.events.length
        victim = bucket
      }
    }
    if (victim && victim.events.length > 0) {
      victim.events.shift()
      this.totalCount--
      if (VERBOSE) {
        console.warn(
          `[gorgo/telemetry] queue full (cap=${this.maxQueueSize}); dropped oldest event from ${victim.pkg.name}`
        )
      }
    }
  }

  private requeue(inflight: Map<string, PackageBucket>): void {
    for (const [key, bucket] of inflight) {
      const existing = this.buckets.get(key)
      if (existing) {
        existing.events.unshift(...bucket.events)
      } else {
        this.buckets.set(key, bucket)
      }
      this.totalCount += bucket.events.length
    }
    while (this.totalCount > this.maxQueueSize) {
      this.dropOldest()
    }
  }

  private buildResourceAttributes(
    pkg: PackageInfo,
    env: EnvInfo,
    machineId: string,
    project: ProjectInfo | null
  ): OtlpAttribute[] {
    return toOtlpAttributes({
      "service.name": process.env.WORKER_MODE ?? "medusa",
      "package.name": pkg.name,
      "package.version": pkg.version,
      machine_id: machineId,
      session_id: this.sessionId,
      ...(project && { "project.id": project.id, "project.hash": project.hash }),
      "env.medusa_version": env.medusa_version,
      "env.node_version": env.node_version,
      "env.os": env.os,
      "env.arch": env.arch,
      "env.ci": env.ci,
      "env.container": env.container,
      "env.node_env": env.node_env,
      "env.locale": env.locale,
      "env.timezone": env.timezone,
      "env.package_manager": env.package_manager,
      "env.store_id": env.store_id ?? null,
      "env.admin_id": env.admin_id ?? null,
      "enabled": this.isEnabledCached(),
    })
  }

  private toLogRecord(event: QueuedEvent): OtlpLogRecord {
    const severity = severityForEvent(event.eventName)
    const attrs: Record<string, unknown> = { "event.name": event.eventName, ...event.properties }
    return {
      timeUnixNano: event.timeUnixNano,
      severityNumber: severity.number,
      severityText: severity.text,
      body: { stringValue: event.eventName },
      attributes: toOtlpAttributes(attrs),
    }
  }
}

export function getDispatcher(options?: DispatcherOptions): TelemetryDispatcher {
  const g = globalThis as Record<symbol, TelemetryDispatcher | undefined>
  let instance = g[DISPATCHER_KEY]
  if (!instance) {
    instance = new TelemetryDispatcher(options)
    g[DISPATCHER_KEY] = instance
  } else if (options && VERBOSE) {
    console.log("[gorgo/telemetry] dispatcher already initialized; ignoring new options")
  }
  return instance
}
