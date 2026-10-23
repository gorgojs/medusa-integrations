"use client"

import { initiatePaymentSession } from "@lib/data/cart"
import type { HttpTypes } from "@medusajs/types"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import type { PaymentMethodCreateParams } from "@stripe/stripe-js"
import { useLocale } from "next-intl"
import {
  PaymentButtonShell,
  type PaymentProviderButtonProps,
  usePlaceOrder,
} from "../shared"

// Both statuses mean the money is secured, whether it is captured now or later.
const isPaymentSettled = (status?: string) =>
  status === "requires_capture" || status === "succeeded"

/**
 * The billing details from the checkout. The Payment Element does not ask for the address
 * (`fields.billingDetails.address: "never"`), and Stripe then needs every field of it, with
 * `null` for an empty one.
 */
const toBillingDetails = (
  cart: HttpTypes.StoreCart
): PaymentMethodCreateParams.BillingDetails => {
  const address = cart.billing_address
  const name = [address?.first_name, address?.last_name].filter(Boolean).join(" ")
  return {
    name: name || null,
    email: cart.email ?? null,
    phone: address?.phone || null,
    address: {
      line1: address?.address_1 || null,
      line2: address?.address_2 || null,
      city: address?.city || null,
      state: address?.province || null,
      postal_code: address?.postal_code || null,
      country: address?.country_code?.toUpperCase() || null,
    },
  } as PaymentMethodCreateParams.BillingDetails
}

/**
 * Pays with the Payment Element. The PaymentIntent does not exist until here. The button
 * validates the form, starts the payment session, which creates the PaymentIntent with the
 * cart's final amount and delivery address, and confirms it with the session's client secret.
 */
const StripePaymentButton = ({
  cart,
  providerId,
  notReady,
  label,
  cartUpdating,
  "data-testid": dataTestId,
}: PaymentProviderButtonProps & { providerId: string }) => {
  const locale = useLocale()
  const stripe = useStripe()
  const elements = useElements()
  const {
    submitting,
    setSubmitting,
    errorMessage,
    setErrorMessage,
    completeOrder,
  } = usePlaceOrder()

  const fail = (message?: string | null) => {
    setErrorMessage(message || null)
    setSubmitting(false)
  }

  const handlePayment = async () => {
    if (!stripe || !elements || !cart || submitting) {
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    const { error: formError } = await elements.submit()
    if (formError) {
      return fail(formError.message)
    }

    let clientSecret: string | undefined
    try {
      const { payment_collection } = await initiatePaymentSession(cart, {
        provider_id: providerId,
      })
      const session = payment_collection?.payment_sessions?.find(
        (s) => s.provider_id === providerId && s.status === "pending"
      )
      clientSecret = session?.data?.client_secret as string | undefined
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err))
    }
    if (!clientSecret) {
      return fail("The payment could not be started.")
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/api/payment-return?cart_id=${cart.id}&locale=${locale}`,
        payment_method_data: {
          billing_details: toBillingDetails(cart),
        },
      },
      // Only leave the site when the selected method actually requires it, so
      // card payments still complete inline.
      redirect: "if_required",
    })

    if (error) {
      if (isPaymentSettled(error.payment_intent?.status)) {
        return completeOrder()
      }
      return fail(error.message)
    }
    if (isPaymentSettled(paymentIntent.status)) {
      return completeOrder()
    }
    setSubmitting(false)
  }

  return (
    <PaymentButtonShell
      label={label}
      onClick={handlePayment}
      disabled={!stripe || !elements || notReady}
      loading={submitting || cartUpdating}
      errorMessage={errorMessage}
      errorTestId="stripe-payment-error-message"
      data-testid={dataTestId}
    />
  )
}

export default StripePaymentButton
