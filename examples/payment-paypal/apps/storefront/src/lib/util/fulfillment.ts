import type { HttpTypes } from "@medusajs/types"

export const isPickupShippingOption = (
  option?: HttpTypes.StoreCartShippingOptionWithServiceZone | null
) => {
  return option?.service_zone?.fulfillment_set?.type === "pickup"
}

export type DeliveryDays = { min?: number; max?: number }

const parseDay = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export const getDeliveryDays = (
  option?: HttpTypes.StoreCartShippingOption | null
): DeliveryDays | null => {
  const meta = (option as { metadata?: Record<string, unknown> | null } | null)
    ?.metadata
  if (!meta) return null

  const min = parseDay(meta.delivery_days_min)
  const max = parseDay(meta.delivery_days_max)

  if (min === undefined && max === undefined) return null

  return { min, max }
}
