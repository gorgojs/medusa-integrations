"use client"

import { loadStripe } from "@stripe/stripe-js/pure"
import type React from "react"
import StripeWrapper from "./stripe-wrapper"
import AuthorizeNetWrapper from "./authorizenet-wrapper"
import type { HttpTypes } from "@medusajs/types"
import { isStripeLike } from "@lib/constants"
import type { AuthorizeNetConfig } from "@lib/data/authorizenet"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  /** The Authorize.net settings, when the cart's region takes Authorize.net. */
  authorizeNetConfig?: AuthorizeNetConfig | null
  children: React.ReactNode
}

const stripeKey =
  process.env.NEXT_PUBLIC_STRIPE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY

const medusaAccountId = process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID
const stripePromise = stripeKey
  ? loadStripe(
      stripeKey,
      medusaAccountId ? { stripeAccount: medusaAccountId } : undefined
    )
  : null

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

  if (
    isStripeLike(paymentSession?.provider_id) &&
    paymentSession &&
    stripePromise
  ) {
    return (
      <StripeWrapper
        paymentSession={paymentSession}
        stripeKey={stripeKey}
        stripePromise={stripePromise}
      >
        {children}
      </StripeWrapper>
    )
  }

  return <div>{children}</div>
}

export default PaymentWrapper
