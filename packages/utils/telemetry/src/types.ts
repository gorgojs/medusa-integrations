export interface PackageInfo {
  name: string
  version: string
}

export interface EnvInfo {
  medusa_version: string
  node_version: string
  os: string
  arch: string
  ci: boolean
  container: boolean
  node_env: string

  locale: string
  timezone: string
  package_manager: "npm" | "yarn" | "pnpm" | "unknown"

  store_id?: string
  admin_id?: string
}

export interface TelemetryEvent {
  event: string
  timestamp: string
  machine_id: string
  session_id?: string
  package: PackageInfo
  env: EnvInfo
  properties?: Record<string, unknown>
}

export interface TelemetryClientOptions {
  packageDir?: string
  package?: PackageInfo
  endpoint?: string
  flushAt?: number
  flushInterval?: number
}
