import { CreditCard } from "@medusajs/icons"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import type { HttpTypes } from "@medusajs/types"
import type React from "react"

/**
 * What the checkout shows for one payment provider. `title` names the method
 * and `subtitle` is the smaller line under it, where the acquirer, the schemes
 * a method accepts or the card an order was paid with go. `icon` is the mark
 * in the option, and a provider without one falls back to a generic card.
 */
export type PaymentInfo = {
  title: string
  subtitle?: string
  icon: React.JSX.Element
}

/* Map of payment provider_id to their icon and, as a fallback for a provider
   with no entry in the `PaymentMethods` catalog, an English title and subtitle.
   Add in any payment providers you want to use, and their labels to
   `messages/*.json`. */
export const paymentInfoMap: Record<string, PaymentInfo> = {
  pp_stripe_stripe: {
    title: "Credit card",
    subtitle: "Stripe",
    icon: <CreditCard />,
  },
  "pp_medusa-payments_default": {
    title: "Credit card",
    subtitle: "Medusa Payments",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: "iDeal",
    subtitle: "Stripe",
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    title: "Bancontact",
    subtitle: "Stripe",
    icon: <Bancontact />,
  },
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <PayPal />,
  },
  pp_system_default: {
    title: "Manual Payment",
    icon: <CreditCard />,
  },
  // Add more payment providers here
}

// This only checks if it is native stripe or medusa payments for card payments, it ignores the other stripe-based providers
export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
}

const paymentSessionDataBuilders: Array<{
  test: (providerId?: string) => boolean | undefined
  isReady?: (cart: HttpTypes.StoreCart) => boolean
  build: (cart: HttpTypes.StoreCart) => Record<string, unknown>
}> = []

export const buildPaymentSessionData = (
  providerId: string | undefined,
  cart: HttpTypes.StoreCart
) => {
  return paymentSessionDataBuilders.find((b) => b.test(providerId))?.build(cart)
}

export const isPaymentSessionReady = (
  providerId: string | undefined,
  cart: HttpTypes.StoreCart
) => {
  const entry = paymentSessionDataBuilders.find((b) => b.test(providerId))
  return entry?.isReady ? entry.isReady(cart) : true
}

/**
 * Shipping providers plug in here the way payment providers plug into
 * `paymentSessionDataBuilders` above. A calculated provider often needs a choice the
 * customer makes after picking the method, a carrier tariff or a pickup point, so the
 * cart can carry a shipping method that is not yet enough to place an order.
 */
export type ShippingOptionDescriptor = {
  test: (option?: HttpTypes.StoreCartShippingOption | null) => boolean
  /**
   * False while the method still owes the customer a choice. The starter's own flat-rate
   * options are ready the moment they are attached, so a provider without this is ready.
   */
  isReady?: (
    cart: HttpTypes.StoreCart,
    option: HttpTypes.StoreCartShippingOption
  ) => boolean
  /**
   * The method has no price until the customer picks what the provider asks for, such as
   * a tariff or a pickup point. Until then the checkout does not quote it, lets it be
   * selected without a price, keeps it off the cart, and takes it off again when the
   * address changes. Which row collects the choice is up to the delivery row dispatcher.
   */
  pricedByChoice?: boolean
  /**
   * Takes a shipping method off the cart. Medusa's store API has no route for it, so a
   * provider priced by choice brings its own. The checkout uses it to leave the cart
   * without a price while the customer has not finished choosing, and to drop a choice
   * made for an address the customer has since changed.
   */
  removeShippingMethod?: (shippingMethodId: string) => Promise<unknown>
}

const shippingOptionDescriptors: ShippingOptionDescriptor[] = []

export const findShippingOptionDescriptor = (
  option?: HttpTypes.StoreCartShippingOption | null
) => (option ? (shippingOptionDescriptors.find((d) => d.test(option)) ?? null) : null)

export const isShippingMethodReady = (
  cart: HttpTypes.StoreCart,
  option?: HttpTypes.StoreCartShippingOption | null
) => {
  if ((cart.shipping_methods?.length ?? 0) < 1) return false
  if (!option) return true

  const descriptor = findShippingOptionDescriptor(option)
  return descriptor?.isReady ? descriptor.isReady(cart, option) : true
}

/**
 * The order the checkout offers the methods in, and so which one it selects on arrival.
 * A shop ranks them through `metadata.rank`; anything unranked sorts after the ranked
 * ones, cheapest first, so the order never depends on what the API happened to return.
 */
export const compareShippingOptions = (
  a: HttpTypes.StoreCartShippingOption,
  b: HttpTypes.StoreCartShippingOption
) => {
  const rank = (option: HttpTypes.StoreCartShippingOption) => {
    const value = (option as { metadata?: Record<string, unknown> | null }).metadata
      ?.rank
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY
  }

  const byRank = rank(a) - rank(b)
  if (byRank !== 0) return byRank

  const byPrice = (a.amount ?? Number.POSITIVE_INFINITY) - (b.amount ?? Number.POSITIVE_INFINITY)
  if (byPrice !== 0) return byPrice

  return a.name.localeCompare(b.name)
}

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

export const addressAutocompleteProvider =
  process.env.NEXT_PUBLIC_ADDRESS_AUTOCOMPLETE_PROVIDER

export const isDaData = (provider?: string) => provider === "dadata"

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]
