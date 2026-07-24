import { getDispatcher, type TelemetryDispatcher } from "./dispatcher.js"
import { findPackageJson } from "./env.js"
import type { PackageInfo, TelemetryClientOptions } from "./types.js"

const VERBOSE =
  process.env.GORGO_TELEMETRY_VERBOSE === "1" || process.env.GORGO_TELEMETRY_VERBOSE === "true"

const UNKNOWN_PACKAGE: PackageInfo = { name: "unknown", version: "0.0.0" }

async function resolvePackageInfo(options: TelemetryClientOptions): Promise<PackageInfo> {
  try {
    if (options.packageDir) {
      const pkg = await findPackageJson(options.packageDir)
      if (pkg) return pkg
      if (VERBOSE) {
        console.warn(
          `[gorgo/telemetry] no package.json found walking up from ${options.packageDir}; using placeholder identity`
        )
      }
      return UNKNOWN_PACKAGE
    }
    if (options.package?.name && options.package?.version) {
      return { name: options.package.name, version: options.package.version }
    }
    if (VERBOSE) {
      console.warn(
        "[gorgo/telemetry] neither `packageDir` nor `package` provided; using placeholder identity"
      )
    }
    return UNKNOWN_PACKAGE
  } catch (err) {
    if (VERBOSE) console.warn("[gorgo/telemetry] package info resolution failed:", err)
    return UNKNOWN_PACKAGE
  }
}

export class TelemetryClient {
  private pkgInfo: PackageInfo = UNKNOWN_PACKAGE
  private pkgInfoResolved = false
  private readonly pkgInfoReady: Promise<PackageInfo>
  private pendingTracks: Array<{ eventName: string; properties: Record<string, unknown> }> = []
  private readonly dispatcher: TelemetryDispatcher

  constructor(options: TelemetryClientOptions) {
    this.dispatcher = getDispatcher({
      endpoint: options.endpoint,
      flushAt: options.flushAt,
      flushInterval: options.flushInterval,
    })
    this.pkgInfoReady = resolvePackageInfo(options).then((info) => {
      this.pkgInfo = info
      this.pkgInfoResolved = true
      this.dispatcher.registerPackage(info)
      for (const t of this.pendingTracks) {
        this.dispatcher.enqueue(info, t.eventName, t.properties)
      }
      this.pendingTracks = []
      return info
    })
  }

  track(eventName: string, properties: Record<string, unknown> = {}): void {
    if (!this.pkgInfoResolved) {
      this.pendingTracks.push({ eventName, properties })
      return
    }
    this.dispatcher.enqueue(this.pkgInfo, eventName, properties)
  }

  async flush(): Promise<void> {
    await this.pkgInfoReady
    return this.dispatcher.flush()
  }

  getPackageInfo(): Promise<PackageInfo> {
    return this.pkgInfoReady
  }

  setEnabled(enabled: boolean): void {
    this.dispatcher.setEnabled(enabled)
  }

  isEnabled(): boolean {
    return this.dispatcher.isEnabled()
  }
}
