import { PaymentSessionStatus } from "@medusajs/framework/utils"
import { PaymentStatuses, PaymentStatusesMap } from "../../types"

/**
 * Regression guard for the static T-Kassa status -> Medusa status table.
 * The order in the array below mirrors the documented T-Kassa lifecycle, so
 * if a status is removed/renamed or its semantic mapping changes, this test
 * will surface it.
 */
const expectedMapping: Array<[string, PaymentSessionStatus]> = [
  ["NEW", PaymentSessionStatus.PENDING],
  ["FORM_SHOWED", PaymentSessionStatus.PENDING],
  ["AUTHORIZING", PaymentSessionStatus.PENDING],
  ["3DS_CHECKING", PaymentSessionStatus.PENDING],
  ["3DS_CHECKED", PaymentSessionStatus.PENDING],
  ["AUTHORIZED", PaymentSessionStatus.AUTHORIZED],
  ["PAY_CHECKING", PaymentSessionStatus.PENDING],
  ["CONFIRMING", PaymentSessionStatus.PENDING],
  ["CONFIRMED", PaymentSessionStatus.CAPTURED],
  ["REVERSING", PaymentSessionStatus.CANCELED],
  ["PARTIAL_REVERSED", PaymentSessionStatus.CANCELED],
  ["REVERSED", PaymentSessionStatus.CANCELED],
  ["REFUNDING", PaymentSessionStatus.CANCELED],
  ["PARTIAL_REFUNDED", PaymentSessionStatus.CANCELED],
  ["REFUNDED", PaymentSessionStatus.CANCELED],
  ["CANCELED", PaymentSessionStatus.CANCELED],
  ["DEADLINE_EXPIRED", PaymentSessionStatus.CANCELED],
  ["REJECTED", PaymentSessionStatus.ERROR],
  ["AUTH_FAIL", PaymentSessionStatus.ERROR],
]

describe("PaymentStatusesMap", () => {
  it.each(expectedMapping)("maps T-Kassa %s -> Medusa %s", (tkassaStatus, expected) => {
    expect((PaymentStatusesMap as any)[tkassaStatus]).toBe(expected)
  })

  it("covers every documented T-Kassa status (length matches expected mapping)", () => {
    // Adding a new key in PaymentStatusesMap without updating this test will
    // fail this assertion — that's the intended regression signal.
    expect(Object.keys(PaymentStatusesMap)).toHaveLength(expectedMapping.length)
  })
})

describe("PaymentStatuses (alias table)", () => {
  // PaymentStatuses is meant to be an identity alias for T-Kassa status strings.
  it("is an identity map (every key equals its own value)", () => {
    for (const [key, value] of Object.entries(PaymentStatuses)) {
      expect(value).toBe(key)
    }
  })
})
