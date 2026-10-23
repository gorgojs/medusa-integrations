import { PaymentActions } from "@medusajs/framework/utils"
import { readRawBody, readSignature, REQUIRED_WEBHOOK_EVENTS, WEBHOOK_ACTIONS } from "../webhook"

describe("WEBHOOK_ACTIONS", () => {
  it("requires exactly the events Medusa acts on", () => {
    expect(REQUIRED_WEBHOOK_EVENTS.sort()).toEqual(["payment_intent.amount_capturable_updated", "payment_intent.succeeded"])
  })

  it("reads the amount that matches each action", () => {
    expect(WEBHOOK_ACTIONS["payment_intent.succeeded"]).toEqual({ action: PaymentActions.SUCCESSFUL, amount: "amount_received" })
    expect(WEBHOOK_ACTIONS["payment_intent.amount_capturable_updated"]).toEqual({
      action: PaymentActions.AUTHORIZED,
      amount: "amount_capturable",
    })
  })
})

describe("readRawBody", () => {
  it.each([
    ["a string", "{}", "{}"],
    ["a Buffer", Buffer.from("{}"), Buffer.from("{}")],
    ["a serialized Buffer", Buffer.from("{}").toJSON(), Buffer.from("{}")],
  ])("reads %s", (_, input, expected) => {
    expect(readRawBody(input)).toEqual(expected)
  })

  it.each([[""], [undefined], [null], [{ id: "evt_1" }], [{ type: "Buffer", data: "x" }]])("refuses %p", (input) => {
    expect(readRawBody(input)).toBeNull()
  })
})

describe("readSignature", () => {
  it.each([
    [{ "stripe-signature": "t=1,v1=a" }],
    [{ "Stripe-Signature": "t=1,v1=a" }],
    [{ "stripe-signature": ["t=1,v1=a", "t=2,v1=b"] }],
  ])("reads %p", (headers) => {
    expect(readSignature(headers)).toBe("t=1,v1=a")
  })

  it.each([[{}], [undefined], [{ "stripe-signature": "" }]])("refuses %p", (headers) => {
    expect(readSignature(headers as any)).toBeNull()
  })
})
