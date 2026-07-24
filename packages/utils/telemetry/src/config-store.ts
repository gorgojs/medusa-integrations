import crypto from "node:crypto"
import Configstore from "configstore"

const VERBOSE =
  process.env.GORGO_TELEMETRY_VERBOSE === "1" || process.env.GORGO_TELEMETRY_VERBOSE === "true"

let instance_: Configstore | undefined

function getStore(): Configstore {
  if (!instance_) {
    instance_ = new Configstore("gorgo", {}, { globalConfigPath: true })
  }
  return instance_
}

export function isTelemetryDisabledByEnv(): boolean {
  return (
    process.env.GORGO_DISABLE_TELEMETRY === "1" ||
    process.env.GORGO_DISABLE_TELEMETRY === "true"
  )
}

export function getMachineId(): string {
  try {
    const cs = getStore()
    let id = cs.get("machine_id") as string | undefined
    if (typeof id !== "string") {
      id = crypto.createHash("sha256").update(crypto.randomBytes(32)).digest("hex")
      cs.set("machine_id", id)
    }
    return id
  } catch (err) {
    if (VERBOSE) console.warn("[gorgo/telemetry] getMachineId failed:", err)
    return ""
  }
}

export function isTelemetryEnabled(): boolean {
  if (isTelemetryDisabledByEnv()) return false
  try {
    return getStore().get("enabled") !== false
  } catch (err) {
    if (VERBOSE) console.warn("[gorgo/telemetry] isTelemetryEnabled failed:", err)
    return true
  }
}

export function setTelemetryEnabled(enabled: boolean): void {
  try {
    getStore().set("enabled", enabled)
  } catch (err) {
    if (VERBOSE) console.warn("[gorgo/telemetry] setTelemetryEnabled failed:", err)
  }
}

export function wasNotificationShown(): boolean {
  try {
    return getStore().get("notification_shown") === true
  } catch (err) {
    if (VERBOSE) console.warn("[gorgo/telemetry] wasNotificationShown failed:", err)
    return true
  }
}

export function markNotificationShown(): void {
  try {
    getStore().set("notification_shown", true)
  } catch (err) {
    if (VERBOSE) console.warn("[gorgo/telemetry] markNotificationShown failed:", err)
  }
}
