/**
 * The shapes the storefront reads off the plugin's store routes, `/store/apiship/*`.
 *
 * They are declared here rather than imported from `@gorgo/medusa-fulfillment-apiship`,
 * because the published package ships its provider code compiled to JavaScript and its
 * `./types` entry points at sources that do not resolve outside the plugin's own build.
 * Only the fields this checkout uses are listed, and every one of them is optional, the
 * way a carrier's answer is.
 */

/** One carrier's tariff, as the calculator returns it. */
export type ApishipBaseTariff = {
  tariffId?: number
  tariffProviderId?: number
  tariffName?: string
  /** The list price, in the region's currency. */
  deliveryCost?: number
  /** The price after the shop's contract discount, which is what the cart is charged. */
  deliveryCostOriginal?: number
  daysMin?: number
  daysMax?: number
}

/** A tariff that delivers to a pickup point also names the points it serves. */
export type ApishipPointTariff = ApishipBaseTariff & {
  pointIds?: number[]
}

/**
 * What ApiShip's calculator answers with, narrowed to the groups that name a carrier.
 * `deliveryToDoor` holds the tariffs that reach an address and `deliveryToPoint` the ones
 * that reach a pickup point.
 */
export type ApishipCalculation = {
  deliveryToDoor?: Array<{
    providerKey: string
    tariffs?: ApishipBaseTariff[]
  }>
  deliveryToPoint?: Array<{
    providerKey: string
    tariffs?: ApishipPointTariff[]
  }>
}

/**
 * A tariff with the two fields the checkout adds, `key` to tell one radio option from the
 * next and `providerKey` to name the carrier it belongs to.
 */
export type ApishipTariff = ApishipPointTariff & {
  key: string
  providerKey: string
}

/** A carrier, as `/store/apiship/providers` returns it. */
export type ApishipProvider = {
  key?: string
  name?: string
  description?: string
}

/** A pickup point, before the storefront has checked it can be drawn. */
export type ApishipRawPoint = {
  id?: number | string | null
  name?: string
  address?: string
  description?: string
  providerKey?: string
  photos?: string[]
  /** Opening hours keyed 1 to 7 from Monday. */
  worktime?: Record<string, string>
  /** The same hours as one line, which is what the summary shows. */
  timetable?: string
  lat?: number | null
  lng?: number | null
}

/** A pickup point that can be drawn, so with an id and coordinates the map can rely on. */
export type ApishipPoint = Omit<ApishipRawPoint, "id" | "lat" | "lng"> & {
  id: string
  lat: number
  lng: number
}

/**
 * What the customer picked, stored on the shipping method so a reload restores it and the
 * plugin can create the ApiShip order from it. `deliveryType` is 1 for an address and 2
 * for a pickup point, matching the shipping option it was chosen under.
 */
export type ApishipSelection = {
  deliveryType: number
  tariff: ApishipTariff
  point?: ApishipPoint
}
