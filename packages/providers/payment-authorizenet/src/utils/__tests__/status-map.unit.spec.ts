import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PaymentSessionStatus } from "@medusajs/framework/utils"
import { mapTransactionStatus, statusFromResponseCode, transactionStatusAfter } from "../status-map"

describe("mapTransactionStatus", () => {
  it.each([
    ["authorizedPendingCapture", PaymentSessionStatus.AUTHORIZED],
    ["capturedPendingSettlement", PaymentSessionStatus.CAPTURED],
    ["settledSuccessfully", PaymentSessionStatus.CAPTURED],
    ["pendingFinalSettlement", PaymentSessionStatus.CAPTURED],
    ["returnedItem", PaymentSessionStatus.CAPTURED],
    ["chargeback", PaymentSessionStatus.CAPTURED],
    ["chargebackReversal", PaymentSessionStatus.CAPTURED],
    ["FDSPendingReview", PaymentSessionStatus.PENDING_AUTHORIZATION],
    ["FDSAuthorizedPendingReview", PaymentSessionStatus.PENDING_AUTHORIZATION],
    ["authorizedPendingRelease", PaymentSessionStatus.PENDING_AUTHORIZATION],
    ["voided", PaymentSessionStatus.CANCELED],
    ["expired", PaymentSessionStatus.CANCELED],
    ["declined", PaymentSessionStatus.ERROR],
    ["communicationError", PaymentSessionStatus.ERROR],
    ["generalError", PaymentSessionStatus.ERROR],
    ["settlementError", PaymentSessionStatus.ERROR],
    ["failedReview", PaymentSessionStatus.ERROR],
    ["couldNotVoid", PaymentSessionStatus.ERROR],
    ["underReview", PaymentSessionStatus.PENDING],
    ["approvedReview", PaymentSessionStatus.PENDING],
    ["pendingSettlement", PaymentSessionStatus.PENDING],
    ["updatingSettlement", PaymentSessionStatus.PENDING],
    ["refundPendingSettlement", PaymentSessionStatus.PENDING],
    ["refundSettledSuccessfully", PaymentSessionStatus.PENDING],
    [undefined, PaymentSessionStatus.PENDING],
  ])("maps %p to %s", (status, expected) => {
    expect(mapTransactionStatus(status)).toBe(expected)
  })

  it("covers every transactionStatus of the XSD", () => {
    // the 24 values of transactionStatusEnum, as the research recorded them on 2026-10-28
    const all = [
      "authorizedPendingCapture",
      "capturedPendingSettlement",
      "communicationError",
      "refundSettledSuccessfully",
      "refundPendingSettlement",
      "approvedReview",
      "declined",
      "couldNotVoid",
      "expired",
      "generalError",
      "pendingFinalSettlement",
      "pendingSettlement",
      "failedReview",
      "settledSuccessfully",
      "settlementError",
      "underReview",
      "updatingSettlement",
      "voided",
      "FDSPendingReview",
      "FDSAuthorizedPendingReview",
      "returnedItem",
      "chargeback",
      "chargebackReversal",
      "authorizedPendingRelease",
    ]
    expect(all).toHaveLength(24)
    const source = readFileSync(join(__dirname, "../status-map.ts"), "utf8")
    const unmapped = all.filter((status) => !source.includes(`"${status}"`))
    // the ones left to the default branch are named in its comment
    expect(unmapped.sort()).toEqual(
      ["approvedReview", "pendingSettlement", "refundPendingSettlement", "refundSettledSuccessfully", "underReview", "updatingSettlement"].sort()
    )
  })
})

describe("statusFromResponseCode", () => {
  it("captures for authCapture and authorizes for authOnly (regression В1)", () => {
    expect(statusFromResponseCode("1", "authCaptureTransaction")).toBe(PaymentSessionStatus.CAPTURED)
    expect(statusFromResponseCode("1", "authOnlyTransaction")).toBe(PaymentSessionStatus.AUTHORIZED)
  })

  it("waits for a held transaction (regression В5)", () => {
    expect(statusFromResponseCode("4", "authCaptureTransaction")).toBe(PaymentSessionStatus.PENDING_AUTHORIZATION)
    expect(statusFromResponseCode("4", "authOnlyTransaction")).toBe(PaymentSessionStatus.PENDING_AUTHORIZATION)
  })
})

describe("transactionStatusAfter", () => {
  it.each([
    ["authOnlyTransaction", "authorizedPendingCapture"],
    ["authCaptureTransaction", "capturedPendingSettlement"],
    ["priorAuthCaptureTransaction", "capturedPendingSettlement"],
    ["voidTransaction", "voided"],
    ["refundTransaction", undefined],
  ] as const)("%s leaves the payment in %p", (type, status) => {
    expect(transactionStatusAfter("1", type)).toBe(status)
  })

  it("leaves a held transaction's status to getTransactionDetails", () => {
    expect(transactionStatusAfter("4", "authCaptureTransaction")).toBeUndefined()
  })
})
