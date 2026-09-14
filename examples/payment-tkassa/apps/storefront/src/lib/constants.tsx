import { defaultLocale } from "@i18n/config"
import { getBaseURL } from "@lib/util/env"
import { CreditCard } from "@medusajs/icons"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import type { HttpTypes } from "@medusajs/types"
import type React from "react"

/* Map of payment provider_id to their icon and, as a fallback for a provider
   with no entry in the `PaymentMethods` catalog, an English title. Add in any
   payment providers you want to use, and their names to `messages/*.json`. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_stripe_stripe: {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_medusa-payments_default": {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: "iDeal",
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    title: "Bancontact",
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
  pp_tkassa_tkassa: {
    title: "T-Kassa",
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

/**
 * The address the customer comes back to after paying on the provider's own
 * page. `<html lang>` carries the locale the checkout was rendered in, so the
 * customer returns to the language they left the shop with.
 */
const paymentReturnUrl = (providerId: string, cartId: string) => {
  const origin =
    typeof window === "undefined" ? getBaseURL() : window.location.origin
  const locale =
    typeof document === "undefined"
      ? defaultLocale
      : document.documentElement.lang || defaultLocale

  return `${origin}/api/payment-return?provider=${providerId}&cart_id=${cartId}&locale=${locale}`
}

const paymentSessionDataBuilders: Array<{
  test: (providerId?: string) => boolean | undefined
  isReady?: (cart: HttpTypes.StoreCart) => boolean
  build: (cart: HttpTypes.StoreCart) => Record<string, unknown>
}> = [
  {
    test: (providerId) => isTkassa(providerId),
    // T-Kassa builds a receipt out of the cart, and the receipt needs the
    // buyer's email and phone. Initiating the session before the checkout
    // collected them creates a payment without one.
    isReady: (cart) => Boolean(cart.email && cart.shipping_address),
    build: (cart) => {
      const returnUrl = paymentReturnUrl("tkassa", cart.id)

      return {
        SuccessURL: returnUrl,
        FailURL: returnUrl,
        cart,
      }
    },
  },
]

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

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}
export const isTkassa = (providerId?: string) => {
  return providerId?.startsWith("pp_tkassa")
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
