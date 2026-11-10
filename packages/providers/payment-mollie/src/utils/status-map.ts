import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"

/** Every payment status Mollie documents (docs: "Handling payment status"). */
export const MOLLIE_PAYMENT_STATUSES = ["open", "pending", "authorized", "paid", "canceled", "expired", "failed"] as const

export type MolliePaymentStatus = (typeof MOLLIE_PAYMENT_STATUSES)[number]

const SESSION_STATUSES: Record<MolliePaymentStatus, PaymentSessionStatus> = {
  // created, the buyer has not finished on Mollie's page yet
  open: PaymentSessionStatus.REQUIRES_MORE,
  // started, the result comes later: the webhook completes the cart once it is paid
  pending: PaymentSessionStatus.PENDING,
  authorized: PaymentSessionStatus.AUTHORIZED,
  paid: PaymentSessionStatus.CAPTURED,
  canceled: PaymentSessionStatus.CANCELED,
  expired: PaymentSessionStatus.CANCELED,
  failed: PaymentSessionStatus.ERROR,
}

/** Mollie's statuses are an open set: a status this package does not know is reported as such. */
export function isKnownPaymentStatus(status: string | undefined): status is MolliePaymentStatus {
  return !!status && (MOLLIE_PAYMENT_STATUSES as readonly string[]).includes(status)
}

/** The Medusa session status for a Mollie payment status. An unknown status waits as `pending`. */
export function sessionStatusFor(status: string | undefined): PaymentSessionStatus {
  return isKnownPaymentStatus(status) ? SESSION_STATUSES[status] : PaymentSessionStatus.PENDING
}

/**
 * The webhook action for a Mollie payment status. Medusa acts only on `authorized` and `captured`;
 * every other status is left to the payment page and to `authorizePayment`.
 */
export function webhookActionFor(status: string | undefined): PaymentActions {
  if (status === "paid") {
    return PaymentActions.SUCCESSFUL
  }
  if (status === "authorized") {
    return PaymentActions.AUTHORIZED
  }
  return PaymentActions.NOT_SUPPORTED
}

/** Refund statuses after which Mollie still pays the money back. */
export const LIVE_REFUND_STATUSES = new Set(["queued", "pending", "processing", "refunded"])
