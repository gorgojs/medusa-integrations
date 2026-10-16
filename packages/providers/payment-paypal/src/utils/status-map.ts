import { PaymentSessionStatus } from "@medusajs/framework/utils"

/** The fields of a PayPal order that decide its Medusa status. */
export type PayPalOrderStatusSource = {
  status?: string
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ status?: string }>
      authorizations?: Array<{ status?: string }>
    }
  }>
}

const normalize = (status?: string) => String(status ?? "").toUpperCase()

/**
 * Status of a PayPal capture as a Medusa session status.
 *
 * PENDING means PayPal holds the funds but has not settled them (eCheck, manual
 * review). It maps to `authorized` rather than `pending`, so the cart still
 * completes, and the PAYMENT.CAPTURE.COMPLETED webhook moves the payment to
 * `captured` later. A partly refunded capture is still a captured payment.
 */
export function mapCaptureStatus(status?: string): PaymentSessionStatus | null {
  switch (normalize(status)) {
    case "COMPLETED":
    case "PARTIALLY_REFUNDED":
      return PaymentSessionStatus.CAPTURED
    case "PENDING":
      return PaymentSessionStatus.AUTHORIZED
    case "DECLINED":
    case "DENIED":
    case "FAILED":
      return PaymentSessionStatus.ERROR
    case "REFUNDED":
    case "REVERSED":
      return PaymentSessionStatus.CANCELED
    default:
      return null
  }
}

/** Status of a PayPal authorization as a Medusa session status. */
export function mapAuthorizationStatus(status?: string): PaymentSessionStatus | null {
  switch (normalize(status)) {
    case "CREATED":
    case "PENDING":
    case "PARTIALLY_CAPTURED":
      return PaymentSessionStatus.AUTHORIZED
    case "CAPTURED":
      return PaymentSessionStatus.CAPTURED
    case "VOIDED":
    case "EXPIRED":
      return PaymentSessionStatus.CANCELED
    case "DENIED":
      return PaymentSessionStatus.ERROR
    default:
      return null
  }
}

/**
 * Status of the PayPal order itself, used when it carries no capture or
 * authorization yet. CREATED, SAVED and PAYER_ACTION_REQUIRED wait on the buyer.
 * APPROVED waits on us: the provider captures or authorizes it in
 * `authorizePayment`, so it is still pending here.
 */
export function mapOrderStatus(status?: string): PaymentSessionStatus {
  switch (normalize(status)) {
    case "CREATED":
    case "SAVED":
    case "PAYER_ACTION_REQUIRED":
      return PaymentSessionStatus.REQUIRES_MORE
    case "COMPLETED":
      return PaymentSessionStatus.CAPTURED
    case "VOIDED":
      return PaymentSessionStatus.CANCELED
    default:
      return PaymentSessionStatus.PENDING
  }
}

/** Medusa status of an order: its capture first, then its authorization, then the order. */
export function resolveOrderStatus(order: PayPalOrderStatusSource): PaymentSessionStatus {
  const payments = order.purchase_units?.[0]?.payments
  const capture = mapCaptureStatus(payments?.captures?.[0]?.status)
  if (capture) {
    return capture
  }
  const authorization = mapAuthorizationStatus(payments?.authorizations?.[0]?.status)
  if (authorization) {
    return authorization
  }
  return mapOrderStatus(order.status)
}
