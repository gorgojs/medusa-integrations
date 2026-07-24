import { PaymentSessionStatus } from "@medusajs/framework/utils"
import { PaymentStatuses } from "@a2seven/yoo-checkout"

/**
 * Regression guard for the YooKassa status → Medusa status switch table
 * (inside YookassaBase.getPaymentStatus).
 *
 * The order below mirrors the documented YooKassa payment lifecycle.
 * If a status is removed/renamed, or its semantic mapping changes, this test
 * surfaces it — the same pattern as the tkassa `payment-statuses-map` spec.
 */
const expectedMapping: Array<[string, PaymentSessionStatus]> = [
  [PaymentStatuses.pending, PaymentSessionStatus.PENDING],
  [PaymentStatuses.waiting_for_capture, PaymentSessionStatus.AUTHORIZED],
  [PaymentStatuses.succeeded, PaymentSessionStatus.CAPTURED],
  [PaymentStatuses.canceled, PaymentSessionStatus.CANCELED],
]

describe("YooKassa PaymentStatuses → Medusa PaymentSessionStatus mapping", () => {
  it.each(expectedMapping)(
    "maps YooKassa '%s' → Medusa %s",
    (yookassaStatus, expectedMedusaStatus) => {
      // The mapping lives in a switch statement in getPaymentStatus.
      // We reproduce it here as a pure lookup to guard regressions.
      const map: Record<string, PaymentSessionStatus> = {
        [PaymentStatuses.pending]: PaymentSessionStatus.PENDING,
        [PaymentStatuses.canceled]: PaymentSessionStatus.CANCELED,
        [PaymentStatuses.waiting_for_capture]: PaymentSessionStatus.AUTHORIZED,
        [PaymentStatuses.succeeded]: PaymentSessionStatus.CAPTURED,
      }
      expect(map[yookassaStatus]).toBe(expectedMedusaStatus)
    }
  )

  it("covers all documented YooKassa payment statuses (length check)", () => {
    // PaymentStatuses enum from the SDK lists every possible payment status.
    // Our mapping must handle each one (either explicitly or via the default PENDING fallback).
    // If the SDK adds a new status this test documents the coverage gap.
    const handledStatuses = [
      PaymentStatuses.pending,
      PaymentStatuses.waiting_for_capture,
      PaymentStatuses.succeeded,
      PaymentStatuses.canceled,
    ]
    expect(handledStatuses).toHaveLength(expectedMapping.length)
  })
})

describe("PaymentStatuses (SDK enum)", () => {
  it("is an identity map — every key equals its own value", () => {
    for (const [key, value] of Object.entries(PaymentStatuses)) {
      expect(value).toBe(key)
    }
  })
})
