"use client"

import type { Stripe, StripeElementsOptions } from "@stripe/stripe-js"
import { loadStripe } from "@stripe/stripe-js/pure"
import { Elements } from "@stripe/react-stripe-js"
import type { HttpTypes } from "@medusajs/types"
import type { StripeConfig } from "@lib/data/stripe"
import { toStripeAmount } from "@lib/util/stripe-amount"
import { createContext, useMemo } from "react"

type StripeWrapperProps = {
  cart: HttpTypes.StoreCart
  config: StripeConfig
  children: React.ReactNode
}

export const StripeContext = createContext(false)

// One Stripe.js instance per publishable key for the whole visit.
const stripePromises = new Map<string, Promise<Stripe | null>>()

const stripeFor = (publishableKey: string) => {
  let promise = stripePromises.get(publishableKey)
  if (!promise) {
    promise = loadStripe(publishableKey)
    stripePromises.set(publishableKey, promise)
  }
  return promise
}

/**
 * Elements in deferred mode, created with the amount, the currency and the capture method of
 * the PaymentIntent the backend will create, and without a client secret. Selecting Stripe or
 * switching methods makes no request. The amount follows the cart, and a wallet updates it
 * itself while its window is open.
 */
const StripeWrapper: React.FC<StripeWrapperProps> = ({
  cart,
  config,
  children,
}) => {
  const stripePromise = useMemo(
    () => stripeFor(config.publishable_key),
    [config.publishable_key]
  )

  const options: StripeElementsOptions = {
    mode: "payment",
    amount: toStripeAmount(cart.total ?? 0, cart.currency_code),
    currency: cart.currency_code.toLowerCase(),
    captureMethod: config.capture_method,
    ...(config.payment_method_configuration
      ? { paymentMethodConfiguration: config.payment_method_configuration }
      : {}),
  }

  return (
    <StripeContext.Provider value={true}>
      <Elements options={options} stripe={stripePromise}>
        {children}
      </Elements>
    </StripeContext.Provider>
  )
}

export default StripeWrapper
