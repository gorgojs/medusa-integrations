"use client"

import { loadStripe } from "@stripe/stripe-js/pure"
import type { Stripe } from "@stripe/stripe-js"
import type React from "react"
import StripeWrapper from "./stripe-wrapper"
import AuthorizeNetWrapper from "./authorizenet-wrapper"
import type { HttpTypes } from "@medusajs/types"
import {
  getMedusaPaymentsAccount,
  isMedusaPayments,
  isStripeLike,
} from "@lib/constants"
import type { AuthorizeNetConfig } from "@lib/data/authorizenet"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  /** The Authorize.net settings, when the cart's region takes Authorize.net. */
  authorizeNetConfig?: AuthorizeNetConfig | null
  children: React.ReactNode
}

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
const medusaPaymentsKey =
  process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY

// loadStripe should only be called once per configuration, so the promises are
// cached. Stripe.js is fetched only once a Stripe session exists.
const stripePromises = new Map<string, Promise<Stripe | null>>()

const getStripePromise = (key: string, stripeAccount?: string) => {
  const cacheKey = `${key}:${stripeAccount ?? ""}`
  if (!stripePromises.has(cacheKey)) {
    stripePromises.set(
      cacheKey,
      loadStripe(key, stripeAccount ? { stripeAccount } : undefined)
    )
  }
  return stripePromises.get(cacheKey)!
}

/**
 * Wraps the checkout in what the cart's payment providers need on the page. Authorize.net loads
 * Accept.js and shares the card form with the pay button, so it wraps the whole checkout whenever
 * the region takes it and there is something to pay.
 */
const PaymentWrapper: React.FC<PaymentWrapperProps> = ({
  cart,
  authorizeNetConfig,
  children,
}) => {
  const content = (
    <StripeOrPlain cart={cart}>{children}</StripeOrPlain>
  )

  if (authorizeNetConfig && (cart.total ?? 0) > 0) {
    return (
      <AuthorizeNetWrapper config={authorizeNetConfig}>
        {content}
      </AuthorizeNetWrapper>
    )
  }

  return content
}

const StripeOrPlain: React.FC<{
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}> = ({ cart, children }) => {
  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  if (paymentSession && isStripeLike(paymentSession.provider_id)) {
    // Medusa Payments creates the payment on the account's Stripe connected
    // account, so Stripe.js has to be initialized for that account.
    const key = isMedusaPayments(paymentSession.provider_id)
      ? medusaPaymentsKey
      : stripeKey
    const stripeAccount = getMedusaPaymentsAccount(paymentSession)

    // Without a key the checkout still renders, the Stripe button stays
    // disabled, and the shopper can pick another method instead of being
    // locked out by a session that keeps failing.
    if (!key) {
      console.error(
        `No publishable key for ${paymentSession.provider_id}. Set NEXT_PUBLIC_STRIPE_KEY (Stripe) or NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY (Medusa Payments).`
      )
      return <div>{children}</div>
    }

    const stripePromise = getStripePromise(key, stripeAccount)

    return (
      <StripeWrapper
        // Elements cannot switch to another Stripe instance once mounted.
        key={`${key}:${stripeAccount ?? ""}`}
        paymentSession={paymentSession}
        stripeKey={key}
        stripePromise={stripePromise}
      >
        {children}
      </StripeWrapper>
    )
  }

  return <div>{children}</div>
}

export default PaymentWrapper
