import { defaultLocale } from "@i18n/config"
import { getBaseURL } from "@lib/util/env"
import { CreditCard } from "@medusajs/icons"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import Robokassa from "@modules/common/icons/robokassa"
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
  pp_robokassa_robokassa: {
    title: "Robokassa",
    subtitle: "Cards, SBP",
    icon: <Robokassa />,
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
 * The locale the checkout was rendered in. `<html lang>` carries it, so a
 * payment page and the return from it both stay in the language the customer
 * left the shop with.
 */
const activeLocale = () =>
  typeof document === "undefined"
    ? defaultLocale
    : document.documentElement.lang || defaultLocale

const paymentReturnUrl = (providerId: string, cartId: string) => {
  const origin =
    typeof window === "undefined" ? getBaseURL() : window.location.origin

  return `${origin}/api/payment-return?provider=${providerId}&cart_id=${cartId}&locale=${activeLocale()}`
}

const paymentSessionDataBuilders: Array<{
  test: (providerId?: string) => boolean | undefined
  isReady?: (cart: HttpTypes.StoreCart) => boolean
  build: (cart: HttpTypes.StoreCart) => Record<string, unknown>
}> = [
  {
    test: (providerId) => isRobokassa(providerId),
    // Robokassa builds a receipt out of the cart and takes the buyer's address
    // for it. Initiating the session before the checkout collected them creates
    // a payment without one.
    isReady: (cart) => Boolean(cart.email && cart.shipping_address),
    build: (cart) => {
      const returnUrl = paymentReturnUrl("robokassa", cart.id)

      return {
        SuccessUrl2: returnUrl,
        SuccessUrl2Method: "GET",
        FailUrl2: returnUrl,
        FailUrl2Method: "GET",
        EMail: cart.email,
        // Robokassa's own payment page speaks Russian or English.
        Culture: activeLocale() === "ru" ? "ru" : "en",
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
export const isRobokassa = (providerId?: string) => {
  return providerId?.startsWith("pp_robokassa")
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
