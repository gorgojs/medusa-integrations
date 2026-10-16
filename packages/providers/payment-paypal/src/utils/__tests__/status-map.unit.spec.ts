import { PaymentSessionStatus } from "@medusajs/framework/utils"
import {
  mapAuthorizationStatus,
  mapCaptureStatus,
  mapOrderStatus,
  resolveOrderStatus,
} from "../status-map"

describe("mapCaptureStatus", () => {
  it.each([
    ["COMPLETED", PaymentSessionStatus.CAPTURED],
    ["completed", PaymentSessionStatus.CAPTURED],
    ["PARTIALLY_REFUNDED", PaymentSessionStatus.CAPTURED],
    // funds held but not settled: the cart completes, the webhook finishes the capture
    ["PENDING", PaymentSessionStatus.AUTHORIZED],
    ["DECLINED", PaymentSessionStatus.ERROR],
    ["DENIED", PaymentSessionStatus.ERROR],
    ["FAILED", PaymentSessionStatus.ERROR],
    ["REFUNDED", PaymentSessionStatus.CANCELED],
    ["REVERSED", PaymentSessionStatus.CANCELED],
    ["SOMETHING_NEW", null],
    [undefined, null],
  ])("%s -> %s", (status, expected) => {
    expect(mapCaptureStatus(status)).toBe(expected)
  })
})

describe("mapAuthorizationStatus", () => {
  it.each([
    ["CREATED", PaymentSessionStatus.AUTHORIZED],
    ["PENDING", PaymentSessionStatus.AUTHORIZED],
    ["PARTIALLY_CAPTURED", PaymentSessionStatus.AUTHORIZED],
    ["CAPTURED", PaymentSessionStatus.CAPTURED],
    ["VOIDED", PaymentSessionStatus.CANCELED],
    ["EXPIRED", PaymentSessionStatus.CANCELED],
    ["DENIED", PaymentSessionStatus.ERROR],
    [undefined, null],
  ])("%s -> %s", (status, expected) => {
    expect(mapAuthorizationStatus(status)).toBe(expected)
  })
})

describe("mapOrderStatus", () => {
  it.each([
    ["CREATED", PaymentSessionStatus.REQUIRES_MORE],
    ["SAVED", PaymentSessionStatus.REQUIRES_MORE],
    ["PAYER_ACTION_REQUIRED", PaymentSessionStatus.REQUIRES_MORE],
    ["APPROVED", PaymentSessionStatus.PENDING],
    ["COMPLETED", PaymentSessionStatus.CAPTURED],
    ["VOIDED", PaymentSessionStatus.CANCELED],
    [undefined, PaymentSessionStatus.PENDING],
  ])("%s -> %s", (status, expected) => {
    expect(mapOrderStatus(status)).toBe(expected)
  })
})

describe("resolveOrderStatus", () => {
  it("prefers the capture over the order status", () => {
    // an order can read COMPLETED while its capture is still PENDING
    const order = {
      status: "COMPLETED",
      purchase_units: [{ payments: { captures: [{ status: "PENDING" }] } }],
    }
    expect(resolveOrderStatus(order)).toBe(PaymentSessionStatus.AUTHORIZED)
  })

  it("uses the authorization when there is no capture", () => {
    const order = {
      status: "COMPLETED",
      purchase_units: [{ payments: { authorizations: [{ status: "CREATED" }] } }],
    }
    expect(resolveOrderStatus(order)).toBe(PaymentSessionStatus.AUTHORIZED)
  })

  it("falls back to the order status", () => {
    expect(resolveOrderStatus({ status: "APPROVED" })).toBe(PaymentSessionStatus.PENDING)
    expect(resolveOrderStatus({ status: "CREATED", purchase_units: [{}] })).toBe(
      PaymentSessionStatus.REQUIRES_MORE
    )
  })
})
