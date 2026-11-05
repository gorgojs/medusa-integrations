import { PaymentSessionStatus } from "@medusajs/framework/utils"
import type { AnetTransactionType } from "../types"

/** Authorized and waiting for capture. */
export const AUTHORIZED_STATUSES = new Set(["authorizedPendingCapture"])

/** Held by the Fraud Detection Suite or split-tender rules: the merchant still has to decide. */
export const HELD_STATUSES = new Set(["FDSPendingReview", "FDSAuthorizedPendingReview", "authorizedPendingRelease"])

/** Captured and not yet settled: only a void of the whole transaction is possible. */
export const UNSETTLED_CAPTURED_STATUSES = new Set(["capturedPendingSettlement"])

/** Settled: a refund is possible. */
export const SETTLED_STATUSES = new Set(["settledSuccessfully"])

/**
 * Maps `transactionStatus` from `getTransactionDetails` (24 values in the XSD) to the session status
 * Medusa expects. Medusa treats only `authorized` and `captured` as paid.
 */
export function mapTransactionStatus(status: string | null | undefined): PaymentSessionStatus {
  switch (status) {
    case "authorizedPendingCapture":
      return PaymentSessionStatus.AUTHORIZED
    case "capturedPendingSettlement":
    case "settledSuccessfully":
    case "pendingFinalSettlement":
    case "returnedItem":
    case "chargeback":
    case "chargebackReversal":
      return PaymentSessionStatus.CAPTURED
    case "FDSPendingReview":
    case "FDSAuthorizedPendingReview":
    case "authorizedPendingRelease":
      return PaymentSessionStatus.PENDING_AUTHORIZATION
    case "voided":
    case "expired":
      return PaymentSessionStatus.CANCELED
    case "declined":
    case "communicationError":
    case "generalError":
    case "settlementError":
    case "failedReview":
    case "couldNotVoid":
      return PaymentSessionStatus.ERROR
    default:
      // the eCheck statuses (underReview, approvedReview, pendingSettlement), updatingSettlement and
      // the refund statuses, which belong to refund transactions rather than to a payment
      return PaymentSessionStatus.PENDING
  }
}

/**
 * The session status after a transaction the gateway accepted: approved (1) captures for
 * `authCaptureTransaction` and authorizes for `authOnlyTransaction`; held for review (4) waits.
 */
export function statusFromResponseCode(
  responseCode: "1" | "4",
  transactionType: AnetTransactionType
): PaymentSessionStatus {
  if (responseCode === "4") {
    return PaymentSessionStatus.PENDING_AUTHORIZATION
  }
  return transactionType === "authCaptureTransaction" ? PaymentSessionStatus.CAPTURED : PaymentSessionStatus.AUTHORIZED
}

/**
 * The `transactionStatus` an approved transaction of this type has right after it was created. For
 * a held one (4) it depends on the filter's action, authorize-and-hold or hold-without-authorizing,
 * so it stays unknown until `getTransactionDetails` reports it.
 */
export function transactionStatusAfter(
  responseCode: "1" | "4",
  transactionType: AnetTransactionType
): string | undefined {
  if (responseCode === "4") {
    return undefined
  }
  switch (transactionType) {
    case "authOnlyTransaction":
      return "authorizedPendingCapture"
    case "authCaptureTransaction":
    case "priorAuthCaptureTransaction":
      return "capturedPendingSettlement"
    case "voidTransaction":
      return "voided"
    default:
      return undefined
  }
}
