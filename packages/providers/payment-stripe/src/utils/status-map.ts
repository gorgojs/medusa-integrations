import { PaymentSessionStatus } from "@medusajs/framework/utils"

type IntentStatusInput = {
  status?: string | null
  last_payment_error?: unknown
}

/**
 * Maps a PaymentIntent's status to the session status Medusa expects. Medusa treats only
 * `authorized` and `captured` as paid; every other status leaves the cart open.
 */
export function mapIntentStatus(intent: IntentStatusInput): PaymentSessionStatus {
  switch (intent.status) {
    case "requires_payment_method":
      // a failed attempt sends the PaymentIntent back to requires_payment_method
      return intent.last_payment_error ? PaymentSessionStatus.ERROR : PaymentSessionStatus.PENDING
    case "requires_confirmation":
    case "processing":
      return PaymentSessionStatus.PENDING
    case "requires_action":
      return PaymentSessionStatus.REQUIRES_MORE
    case "requires_capture":
      return PaymentSessionStatus.AUTHORIZED
    case "succeeded":
      return PaymentSessionStatus.CAPTURED
    case "canceled":
      return PaymentSessionStatus.CANCELED
    default:
      return PaymentSessionStatus.PENDING
  }
}

/** PaymentIntent statuses the buyer has not confirmed yet, which can still be canceled or changed. */
export const UNCONFIRMED_INTENT_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
])
