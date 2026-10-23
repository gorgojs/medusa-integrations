"use client"

import type React from "react"
import StripeWrapper from "./stripe-wrapper"
import type { HttpTypes } from "@medusajs/types"
import type { StripeConfig } from "@lib/data/stripe"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  /** The Stripe settings, when Stripe is enabled in the cart's region. */
  stripeConfig: StripeConfig | null
  children: React.ReactNode
}

/**
 * Wraps the whole checkout in the Stripe Elements when the cart's region takes Stripe, so the
 * card form and the express checkout row share one deferred PaymentIntent setup. The
 * PaymentIntent is created only when the customer pays.
 */
const PaymentWrapper: React.FC<PaymentWrapperProps> = ({
  cart,
  stripeConfig,
  children,
}) => {
  if (stripeConfig && (cart.total ?? 0) > 0) {
    return (
      <StripeWrapper cart={cart} config={stripeConfig}>
        {children}
      </StripeWrapper>
    )
  }

  return <div>{children}</div>
}

export default PaymentWrapper
