import {
  isTelemetryEnabled,
  markNotificationShown,
  wasNotificationShown,
} from "./config-store.js"

export function maybeShowFirstRunNotice(): void {
  try {
    if (!isTelemetryEnabled()) return
    if (wasNotificationShown()) return
    if (process.env.CI === "1" || process.env.CI === "true") return

    printNotice()
    markNotificationShown()
  } catch {
  }
}

function printNotice(): void {
  console.info()
  console.info("Gorgo collects anonymous telemetry to help improve Medusa plugins. To opt out, set `GORGO_DISABLE_TELEMETRY=true`.")
}
