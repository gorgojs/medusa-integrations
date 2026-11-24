import type { StripeError } from "@stripe/stripe-js"

/**
 * The message a failed Stripe confirmation passes to the checkout's error
 * slot, which shows it as one of the storefront's own translated errors. Card
 * and validation errors are the shopper's to fix and pass through. Anything
 * else describes our setup, so it is logged for the developer first.
 */
export const getPaymentErrorMessage = (
  error?: Partial<StripeError> | null
): string | null => {
  if (!error) {
    return null
  }

  if (
    (error.type === "card_error" || error.type === "validation_error") &&
    error.message
  ) {
    return error.message
  }

  console.error("Payment failed", error)
  return "payment failed"
}
