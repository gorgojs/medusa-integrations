import type { HttpTypes } from "@medusajs/types"
import type { ApishipCalculation, ApishipTariff } from "./types"

export const APISHIP_PROVIDER_ID = "apiship_apiship"

export const isApishipOption = (
  option?: HttpTypes.StoreCartShippingOption | null
) => option?.provider_id === APISHIP_PROVIDER_ID

/**
 * Which half of the calculation a shipping option draws on. The seed writes
 * `deliveryType` into the option's own data, 1 for a courier and 2 for a pickup point.
 */
export const getApishipDeliveryType = (
  option?: HttpTypes.StoreCartShippingOption | null
): 1 | 2 | null => {
  if (!isApishipOption(option)) return null

  const deliveryType = (option?.data as { deliveryType?: unknown } | null)
    ?.deliveryType

  return deliveryType === 1 || deliveryType === 2 ? deliveryType : null
}

/**
 * ApiShip quotes every tariff twice, `deliveryCost` and `deliveryCostOriginal`. The
 * fulfillment provider bills the cart with `deliveryCost`, so that is the one the checkout
 * shows, and the customer pays what they picked.
 */
export const getTariffCost = (tariff: ApishipTariff) =>
  typeof tariff.deliveryCost === "number" ? tariff.deliveryCost : null

export const getTariffDays = (tariff: ApishipTariff) => {
  const min = tariff.daysMin ?? 0
  const max = tariff.daysMax ?? 0

  if (!min && !max) return null

  return { min: min || max, max: max || min }
}

/**
 * Identifies a tariff across a render. ApiShip has no single id that is always filled in,
 * so the carrier key is combined with whichever of its ids came back, and the index closes
 * the gap for a carrier that sent neither.
 */
export const buildTariffKey = (
  providerKey: string,
  tariff: Omit<ApishipTariff, "key" | "providerKey">,
  index: number
) =>
  `${providerKey}:${tariff.tariffId ?? tariff.tariffProviderId ?? tariff.tariffName ?? index}`

/**
 * Inverts the calculation into "which tariffs serve this pickup point", which is the
 * question the map asks once the customer clicks a marker. One tariff usually covers many
 * points, so it is listed under each of them.
 */
export const buildTariffsByPointId = (
  calculation?: ApishipCalculation | null
) => {
  const tariffsByPointId: Record<string, ApishipTariff[]> = {}

  calculation?.deliveryToPoint?.forEach(({ providerKey, tariffs }) => {
    tariffs?.forEach((tariff, index) => {
      const key = buildTariffKey(providerKey, tariff, index)

      for (const pointId of tariff.pointIds ?? []) {
        const entry: ApishipTariff = { key, providerKey, ...tariff }
        const pointTariffs = (tariffsByPointId[String(pointId)] ??= [])

        if (!pointTariffs.some((t) => t.key === key)) {
          pointTariffs.push(entry)
        }
      }
    })
  })

  return tariffsByPointId
}

export const extractPointIds = (
  tariffsByPointId: Record<string, ApishipTariff[]>
) => Object.keys(tariffsByPointId).map(Number).filter(Number.isFinite)

/**
 * Flattens the courier half of the calculation into carrier groups, dropping a tariff a
 * carrier listed twice and a group left with nothing.
 */
export const buildDoorGroups = (calculation?: ApishipCalculation | null) => {
  const seen = new Set<string>()

  return (calculation?.deliveryToDoor ?? [])
    .map((group) => ({
      providerKey: group.providerKey,
      tariffs: (group.tariffs ?? []).flatMap((tariff, index) => {
        const key = buildTariffKey(group.providerKey, tariff, index)

        if (seen.has(key)) return []
        seen.add(key)

        return [{ ...tariff, key, providerKey: group.providerKey }]
      }),
    }))
    .filter((group) => group.tariffs.length > 0)
}

export const groupWorktime = (worktime: Record<string, string>) => {
  const groups: Array<{ from: number; to: number; hours: string }> = []

  for (let day = 1; day <= 7; day++) {
    const hours = worktime[String(day)]
    if (!hours) continue

    const last = groups.at(-1)
    if (last && last.hours === hours && last.to === day - 1) last.to = day
    else groups.push({ from: day, to: day, hours })
  }

  return groups
}

/**
 * The tariff and pickup point the customer settled on, as stored on the shipping method.
 * The cart holds one method at a time, so it only answers for the option that method was
 * created for.
 */
export const getApishipSelection = (
  cart: HttpTypes.StoreCart,
  optionId: string
) => {
  const method = cart.shipping_methods?.at(-1)
  if (!method || method.shipping_option_id !== optionId) return null

  return (
    (method.data as {
      apishipData?: import("./types").ApishipSelection
    } | null)?.apishipData ?? null
  )
}
