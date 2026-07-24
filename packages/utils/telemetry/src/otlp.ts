export type OtlpAnyValue =
  | { stringValue: string }
  | { boolValue: boolean }
  | { intValue: number }
  | { doubleValue: number }
  | { arrayValue: { values: OtlpAnyValue[] } }
  | { kvlistValue: { values: OtlpAttribute[] } }

export type OtlpAttribute = { key: string; value: OtlpAnyValue }

export type OtlpLogRecord = {
  timeUnixNano: string
  severityNumber: number
  severityText: string
  body: OtlpAnyValue
  attributes: OtlpAttribute[]
}

export type OtlpLogsPayload = {
  resourceLogs: Array<{
    resource: { attributes: OtlpAttribute[] }
    scopeLogs: Array<{
      scope: { name: string; version: string }
      logRecords: OtlpLogRecord[]
    }>
  }>
}

export function toOtlpValue(value: unknown): OtlpAnyValue {
  if (typeof value === "string") return { stringValue: value }
  if (typeof value === "boolean") return { boolValue: value }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { intValue: value } : { doubleValue: value }
  }
  if (value === null || value === undefined) return { stringValue: "" }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toOtlpValue) } }
  if (typeof value === "object") {
    return { kvlistValue: { values: toOtlpAttributes(value as Record<string, unknown>) } }
  }
  return { stringValue: String(value) }
}

export function toOtlpAttributes(map: Record<string, unknown>): OtlpAttribute[] {
  return Object.entries(map)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({ key, value: toOtlpValue(value) }))
}

export function severityForEvent(eventName: string): { number: number; text: string } {
  if (eventName.startsWith("error.") || eventName.endsWith(".failed")) {
    return { number: 17, text: "ERROR" }
  }
  return { number: 9, text: "INFO" }
}
