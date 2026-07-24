import { PaymentSessionStatus } from "@medusajs/framework/utils"

// Mirror of the inline map in robokassa-base.ts.
// Regression guard: if a code is removed/renamed or its semantic mapping changes, this test surfaces it.
// Codes are documented at https://docs.robokassa.ru/en/pay-interface/checking-operation-state/
const PaymentStateCodesMap: Record<number, PaymentSessionStatus> = {
  3: PaymentSessionStatus.PENDING,
  5: PaymentSessionStatus.PENDING,
  10: PaymentSessionStatus.CANCELED,
  20: PaymentSessionStatus.AUTHORIZED,
  50: PaymentSessionStatus.PENDING,
  60: PaymentSessionStatus.CANCELED,
  80: PaymentSessionStatus.REQUIRES_MORE,
  100: PaymentSessionStatus.CAPTURED,
}

const expectedMapping: Array<[number, PaymentSessionStatus]> = [
  [3, PaymentSessionStatus.PENDING],
  [5, PaymentSessionStatus.PENDING],
  [10, PaymentSessionStatus.CANCELED],
  [20, PaymentSessionStatus.AUTHORIZED],
  [50, PaymentSessionStatus.PENDING],
  [60, PaymentSessionStatus.CANCELED],
  [80, PaymentSessionStatus.REQUIRES_MORE],
  [100, PaymentSessionStatus.CAPTURED],
]

describe("PaymentStateCodesMap", () => {
  it.each(expectedMapping)("maps state code %i -> %s", (code, expected) => {
    expect(PaymentStateCodesMap[code]).toBe(expected)
  })

  it("covers every documented Robokassa state code (length matches expected mapping)", () => {
    // Adding a new key without updating this test will fail this assertion.
    expect(Object.keys(PaymentStateCodesMap)).toHaveLength(expectedMapping.length)
  })
})
