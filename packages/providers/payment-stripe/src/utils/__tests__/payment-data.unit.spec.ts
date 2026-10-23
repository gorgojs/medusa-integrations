import { normalizeSessionData, readIntentId, scrubbed, toSessionData } from "../payment-data"

const intent = {
  id: "pi_1",
  object: "payment_intent",
  status: "requires_capture",
  amount: 1999,
  amount_received: 0,
  currency: "usd",
  capture_method: "manual",
  client_secret: "pi_1_secret_abc",
  payment_method: {
    id: "pm_1",
    type: "card",
    card: { brand: "visa", last4: "4242", wallet: { type: "apple_pay" } },
    billing_details: { email: "buyer@example.com" },
  },
  latest_charge: null,
  metadata: { session_id: "payses_1" },
} as any

describe("toSessionData", () => {
  it("keeps the ids, amounts and card summary, and drops the client secret by default", () => {
    expect(toSessionData(intent, { session_id: "payses_1" })).toEqual({
      session_id: "payses_1",
      id: "pi_1",
      status: "requires_capture",
      amount: 1999,
      currency: "usd",
      capture_method: "manual",
      payment_method_type: "card",
      card_brand: "visa",
      card_last4: "4242",
      wallet: "apple_pay",
    })
  })

  it("keeps the client secret for a session the storefront still has to confirm", () => {
    expect(toSessionData(intent, {}, { keepClientSecret: true }).client_secret).toBe("pi_1_secret_abc")
  })

  it("reads the card from the latest charge when the payment method is not expanded", () => {
    const data = toSessionData({
      ...intent,
      payment_method: "pm_1",
      latest_charge: {
        payment_method_details: { type: "card", card: { brand: "mastercard", last4: "4444", wallet: null } },
      },
    })
    expect(data).toMatchObject({ payment_method_type: "card", card_brand: "mastercard", card_last4: "4444" })
    expect(data.wallet).toBeUndefined()
  })

  it("keeps earlier refunds and card details", () => {
    const data = toSessionData(
      { ...intent, payment_method: null },
      { refunds: [{ id: "re_1", status: "succeeded", amount: 500 }], card_last4: "4242" }
    )
    expect(data.refunds).toEqual([{ id: "re_1", status: "succeeded", amount: 500 }])
    expect(data.card_last4).toBe("4242")
  })

  it("records the received amount once Stripe has it", () => {
    expect(toSessionData({ ...intent, status: "succeeded", amount_received: 1999 }).amount_received).toBe(1999)
  })
})

describe("normalizeSessionData", () => {
  it("reduces the core provider's whole PaymentIntent and drops its secret and billing details", () => {
    const data = normalizeSessionData({ ...intent, session_id: "payses_1" })
    expect(data).toMatchObject({ id: "pi_1", session_id: "payses_1", amount: 1999, currency: "usd" })
    expect(data).not.toHaveProperty("client_secret")
    expect(data).not.toHaveProperty("payment_method")
    expect(data).not.toHaveProperty("metadata")
  })

  it("leaves this provider's data as it is", () => {
    const data = { id: "pi_1", amount: 1999, currency: "usd", client_secret: "pi_1_secret_abc" }
    expect(normalizeSessionData(data)).toBe(data)
  })

  it("turns missing data into an empty object", () => {
    expect(normalizeSessionData(undefined)).toEqual({})
  })
})

describe("readIntentId", () => {
  it.each([
    [{ id: "pi_1" }, "pi_1"],
    [{ id: "payses_1" }, undefined],
    [{ id: 42 }, undefined],
    [{}, undefined],
    [undefined, undefined],
  ])("%p → %p", (data, expected) => {
    expect(readIntentId(data as any)).toBe(expected)
  })
})

describe("scrubbed", () => {
  it("clears with null the secrets the stored data had and the new data drops", () => {
    expect(
      scrubbed({ id: "pi_1", status: "succeeded" }, { id: "pi_1", client_secret: "pi_1_secret", payment_method: { id: "pm_1" } })
    ).toEqual({ id: "pi_1", status: "succeeded", client_secret: null, payment_method: null })
  })

  it("keeps a secret the new data still carries, and adds nothing the stored data did not have", () => {
    expect(scrubbed({ id: "pi_1", client_secret: "pi_1_secret" }, { client_secret: "pi_1_secret" })).toEqual({
      id: "pi_1",
      client_secret: "pi_1_secret",
    })
    expect(scrubbed({ id: "pi_1" }, { id: "pi_1" })).toEqual({ id: "pi_1" })
    expect(scrubbed({ id: "pi_1" }, undefined)).toEqual({ id: "pi_1" })
  })
})
