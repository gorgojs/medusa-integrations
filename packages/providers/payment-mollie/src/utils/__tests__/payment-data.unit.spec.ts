import {
  MAX_REDIRECT_URL_LENGTH,
  readPaymentId,
  readRedirectUrl,
  readSessionInput,
  toPaymentData,
} from "../payment-data"

const PAYMENT = {
  resource: "payment",
  id: "tr_7UhSN1zuXS",
  mode: "test",
  description: "Cart cart_1",
  amount: { currency: "EUR", value: "19.99" },
  status: "paid",
  method: "creditcard",
  captureMode: "automatic",
  sequenceType: "oneoff",
  profileId: "pfl_QkEhN94Ba",
  createdAt: "2026-11-02T10:00:00+00:00",
  details: { cardNumber: "6787", cardLabel: "Mastercard", failureReason: null },
  links: {
    self: { href: "https://api.mollie.com/v2/payments/tr_7UhSN1zuXS", type: "application/hal+json" },
    dashboard: { href: "https://my.mollie.com/dashboard/payments/tr_7UhSN1zuXS", type: "text/html" },
  },
} as any

describe("readRedirectUrl", () => {
  it("takes an absolute http(s) URL", () => {
    expect(readRedirectUrl("https://shop.example.com/api/payment-return?cart_id=1")).toBe(
      "https://shop.example.com/api/payment-return?cart_id=1"
    )
    expect(readRedirectUrl("http://localhost:8000/api/payment-return")).toBe("http://localhost:8000/api/payment-return")
  })

  it.each([
    "/api/payment-return",
    "javascript:alert(1)",
    "ftp://example.com",
    "",
    42,
    undefined,
    `https://example.com/${"a".repeat(MAX_REDIRECT_URL_LENGTH)}`,
  ])("refuses %s", (value) => {
    expect(readRedirectUrl(value)).toBeUndefined()
  })
})

describe("readSessionInput", () => {
  it("keeps the session id, the return URL and the locale, and names what it drops", () => {
    expect(
      readSessionInput({
        session_id: "payses_1",
        redirect_url: "https://shop.example.com/return",
        locale: "nl",
        cart: { id: "cart_1" },
        amount: 1,
        webhookUrl: "https://evil.example.com",
      })
    ).toEqual({
      sessionId: "payses_1",
      redirectUrl: "https://shop.example.com/return",
      locale: "nl",
      dropped: ["cart", "amount", "webhookUrl"],
    })
  })

  it("drops a locale that is too long to be one", () => {
    expect(readSessionInput({ locale: "x".repeat(11) }).locale).toBeUndefined()
    expect(readSessionInput(undefined)).toEqual({ dropped: [] })
  })
})

describe("readPaymentId", () => {
  it("reads only a Mollie payment id", () => {
    expect(readPaymentId({ id: "tr_7UhSN1zuXS" })).toBe("tr_7UhSN1zuXS")
    expect(readPaymentId({ id: "re_4qqhO89gsT" })).toBeUndefined()
    expect(readPaymentId({ id: "tr_../../v2/refunds" })).toBeUndefined()
    expect(readPaymentId(undefined)).toBeUndefined()
  })
})

describe("toPaymentData", () => {
  it("keeps what the provider needs from the payment and the previous data", () => {
    expect(
      toPaymentData(PAYMENT, {
        session_id: "payses_1",
        checkout_url: "https://www.mollie.com/checkout/select-method/7UhSN1zuXS",
        refunds: [{ id: "re_1", status: "pending", amount: 5 }],
      })
    ).toEqual({
      session_id: "payses_1",
      refunds: [{ id: "re_1", status: "pending", amount: 5 }],
      id: "tr_7UhSN1zuXS",
      status: "paid",
      mode: "test",
      checkout_url: null,
      expires_at: null,
      amount: 19.99,
      currency_code: "eur",
      capture_mode: "automatic",
      method: "creditcard",
      card_brand: "Mastercard",
      card_last4: "6787",
      failure_reason: null,
    })
  })

  it("keeps the payment page and the expiry of an open payment", () => {
    const data = toPaymentData({
      ...PAYMENT,
      status: "open",
      method: null,
      details: null,
      expiresAt: "2026-11-02T10:15:00+00:00",
      links: { ...PAYMENT.links, checkout: { href: "https://www.mollie.com/checkout/select-method/7UhSN1zuXS", type: "text/html" } },
    })
    expect(data).toMatchObject({
      status: "open",
      checkout_url: "https://www.mollie.com/checkout/select-method/7UhSN1zuXS",
      expires_at: "2026-11-02T10:15:00+00:00",
      method: null,
      card_last4: null,
    })
  })

  it("keeps the failure reason of a failed card payment", () => {
    const data = toPaymentData({ ...PAYMENT, status: "failed", details: { failureReason: "insufficient_funds" } })
    expect(data.failure_reason).toBe("insufficient_funds")
  })
})
