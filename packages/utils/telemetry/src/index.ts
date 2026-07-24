export { TelemetryClient } from "./client.js"
export { TelemetryDispatcher, getDispatcher } from "./dispatcher.js"
export type { DispatcherOptions } from "./dispatcher.js"
export {
  getMachineId,
  isTelemetryEnabled,
  setTelemetryEnabled,
  wasNotificationShown,
  markNotificationShown,
} from "./config-store.js"
export { maybeShowFirstRunNotice } from "./notice.js"
export { collectEnvInfo, findPackageJson } from "./env.js"
export { collectProjectInfo } from "./project.js"
export type { ProjectInfo } from "./project.js"
export type {
  PackageInfo,
  EnvInfo,
  TelemetryEvent,
  TelemetryClientOptions,
} from "./types.js"

import { TelemetryClient } from "./client.js"
import type { TelemetryClientOptions } from "./types.js"

export function createTelemetryClient(options: TelemetryClientOptions): TelemetryClient {
  return new TelemetryClient(options)
}
