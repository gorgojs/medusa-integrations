import { PaymentSessionStatus } from "@medusajs/framework/utils"
import { mapIntentStatus, UNCONFIRMED_INTENT_STATUSES } from "../status-map"

describe("mapIntentStatus", () => {
  it.each([
    ["requires_payment_method", PaymentSessionStatus.PENDING],
    ["requires_confirmation", PaymentSessionStatus.PENDING],
    ["processing", PaymentSessionStatus.PENDING],
    ["requires_action", PaymentSessionStatus.REQUIRES_MORE],
    ["requires_capture", PaymentSessionStatus.AUTHORIZED],
    ["succeeded", PaymentSessionStatus.CAPTURED],
    ["canceled", PaymentSessionStatus.CANCELED],
    ["something_new", PaymentSessionStatus.PENDING],
    [undefined, PaymentSessionStatus.PENDING],
  ])("%s → %s", (status, expected) => {
    expect(mapIntentStatus({ status })).toBe(expected)
  })

  it("reports a failed attempt as an error", () => {
    expect(
      mapIntentStatus({ status: "requires_payment_method", last_payment_error: { code: "card_declined" } })
    ).toBe(PaymentSessionStatus.ERROR)
  })
})

describe("UNCONFIRMED_INTENT_STATUSES", () => {
  it("holds only the statuses before the buyer confirmed", () => {
    expect([...UNCONFIRMED_INTENT_STATUSES].sort()).toEqual([
      "requires_action",
      "requires_confirmation",
      "requires_payment_method",
    ])
  })
})
