import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { isKnownPaymentStatus, sessionStatusFor, webhookActionFor } from "../status-map"

describe("sessionStatusFor", () => {
  it.each([
    ["open", PaymentSessionStatus.REQUIRES_MORE],
    ["pending", PaymentSessionStatus.PENDING],
    ["authorized", PaymentSessionStatus.AUTHORIZED],
    ["paid", PaymentSessionStatus.CAPTURED],
    ["canceled", PaymentSessionStatus.CANCELED],
    ["expired", PaymentSessionStatus.CANCELED],
    ["failed", PaymentSessionStatus.ERROR],
  ])("maps %s to %s", (status, expected) => {
    expect(sessionStatusFor(status)).toBe(expected)
  })

  it("keeps an unknown status pending", () => {
    expect(sessionStatusFor("settled")).toBe(PaymentSessionStatus.PENDING)
    expect(sessionStatusFor(undefined)).toBe(PaymentSessionStatus.PENDING)
    expect(isKnownPaymentStatus("settled")).toBe(false)
    expect(isKnownPaymentStatus("paid")).toBe(true)
  })
})

describe("webhookActionFor", () => {
  it("acts on paid and authorized only", () => {
    expect(webhookActionFor("paid")).toBe(PaymentActions.SUCCESSFUL)
    expect(webhookActionFor("authorized")).toBe(PaymentActions.AUTHORIZED)
    for (const status of ["open", "pending", "canceled", "expired", "failed", "settled", undefined]) {
      expect(webhookActionFor(status)).toBe(PaymentActions.NOT_SUPPORTED)
    }
  })
})
