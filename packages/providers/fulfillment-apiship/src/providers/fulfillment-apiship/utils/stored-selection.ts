import type { FoundTariff } from "./find-tariff"

const TARIFF_FIELDS = [
  "tariffId",
  "tariffProviderId",
  "tariffName",
  "deliveryCost",
  "deliveryCostOriginal",
  "daysMin",
  "daysMax",
] as const

const asText = (value: unknown) =>
  typeof value === "string" ? value.slice(0, 500) : undefined

export function pickStoredTariff(tariff: FoundTariff, key: unknown) {
  const stored: Record<string, unknown> = { providerKey: tariff.providerKey }

  for (const field of TARIFF_FIELDS) {
    if (tariff[field] !== undefined && tariff[field] !== null) {
      stored[field] = tariff[field]
    }
  }

  const storefrontKey = asText(key)
  if (storefrontKey) {
    stored.key = storefrontKey
  }

  return stored
}

export function pickStoredPoint(point: Record<string, unknown>, providerKey: string) {
  const stored: Record<string, unknown> = {
    id: String(point.id),
    providerKey,
  }

  const name = asText(point.name)
  const address = asText(point.address)
  if (name) stored.name = name
  if (address) stored.address = address

  return stored
}
