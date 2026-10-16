import { PaymentActions } from "@medusajs/framework/utils"
import { makeProvider, order, paypalError, SESSION_ID } from "./test-utils"

const WEBHOOK_ID = "WH-1"

const HEADERS = {
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-cert-url": "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-1",
  "paypal-transmission-id": "TX-1",
  "paypal-transmission-sig": "SIG",
  "paypal-transmission-time": "2026-10-12T10:00:00Z",
}

function event(eventType: string, resource: Record<string, unknown> = {}) {
  return {
    id: "WH-EVENT-1",
    event_type: eventType,
    resource: { id: "RES-1", amount: { currency_code: "EUR", value: "10.00" }, ...resource },
  }
}

function payload(body: unknown, headers: Record<string, unknown> = HEADERS) {
  const raw = typeof body === "string" ? body : JSON.stringify(body)
  return { data: typeof body === "string" ? {} : (body as Record<string, unknown>), rawData: Buffer.from(raw), headers }
}

function setup(verification = "SUCCESS", options: Record<string, unknown> = { webhookId: WEBHOOK_ID }) {
  const made = makeProvider(options)
  made.client.verifyWebhookSignature.mockResolvedValue({ verification_status: verification })
  return made
}

describe("PayPalBase.isWebhookEventValid", () => {
  it("verifies the signature headers, the webhook id and the raw body with PayPal", async () => {
    const { provider, client } = setup()
    const raw = JSON.stringify(event("PAYMENT.CAPTURE.COMPLETED", { custom_id: SESSION_ID }))

    await expect(provider.isWebhookEventValid(payload(raw))).resolves.toBe(true)
    expect(client.verifyWebhookSignature).toHaveBeenCalledWith(
      {
        auth_algo: "SHA256withRSA",
        cert_url: HEADERS["paypal-cert-url"],
        transmission_id: "TX-1",
        transmission_sig: "SIG",
        transmission_time: "2026-10-12T10:00:00Z",
        webhook_id: WEBHOOK_ID,
      },
      raw
    )
  })

  it("sends the body parsed from rawData, not the parsed data Medusa passes", async () => {
    const { provider, client } = setup()
    const raw = '{"id":"WH-EVENT-1","event_type":"PAYMENT.CAPTURE.COMPLETED","resource":{"custom_id":"payses_1"}}'

    await provider.isWebhookEventValid({ data: { tampered: true }, rawData: raw, headers: HEADERS })

    expect(client.verifyWebhookSignature.mock.calls[0][1]).toBe(raw)
  })

  it("rejects FAILURE", async () => {
    const { provider, logger } = setup("FAILURE")

    await expect(provider.isWebhookEventValid(payload(event("PAYMENT.CAPTURE.COMPLETED")))).resolves.toBe(false)
    expect(logger.warn).toHaveBeenCalled()
  })

  it("rejects VERIFIED, which PayPal never returns for a valid signature", async () => {
    const { provider } = setup("VERIFIED")

    await expect(provider.isWebhookEventValid(payload(event("PAYMENT.CAPTURE.COMPLETED")))).resolves.toBe(false)
  })

  it("rejects every delivery when no webhook id is configured, without calling PayPal", async () => {
    const { provider, client, logger } = setup("SUCCESS", {})

    await expect(provider.isWebhookEventValid(payload(event("PAYMENT.CAPTURE.COMPLETED")))).resolves.toBe(false)
    expect(client.verifyWebhookSignature).not.toHaveBeenCalled()
    expect(logger.warn.mock.calls[0][0]).toContain("no webhook ID")
  })

  it.each(Object.keys(HEADERS))("rejects a delivery without %s", async (header) => {
    const { provider, client } = setup()
    const headers: Record<string, unknown> = { ...HEADERS }
    delete headers[header]

    await expect(provider.isWebhookEventValid(payload(event("PAYMENT.CAPTURE.COMPLETED"), headers))).resolves.toBe(false)
    expect(client.verifyWebhookSignature).not.toHaveBeenCalled()
  })

  it.each([
    "https://evil.example/v1/notifications/certs/CERT-1",
    "https://api.paypal.com.evil.example/certs",
    "http://api.paypal.com/v1/notifications/certs/CERT-1",
    "https://api.paypal.com:8443/v1/notifications/certs/CERT-1",
    "not a url",
  ])("rejects the certificate URL %s", async (certUrl) => {
    const { provider, client } = setup()

    await expect(
      provider.isWebhookEventValid(payload(event("PAYMENT.CAPTURE.COMPLETED"), { ...HEADERS, "paypal-cert-url": certUrl }))
    ).resolves.toBe(false)
    expect(client.verifyWebhookSignature).not.toHaveBeenCalled()
  })

  it.each([
    "https://api.paypal.com/v1/notifications/certs/CERT-1",
    "https://api-m.paypal.com/v1/notifications/certs/CERT-1",
    "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
  ])("accepts the certificate URL %s", async (certUrl) => {
    const { provider } = setup()

    await expect(
      provider.isWebhookEventValid(payload(event("PAYMENT.CAPTURE.COMPLETED"), { ...HEADERS, "paypal-cert-url": certUrl }))
    ).resolves.toBe(true)
  })

  it("rejects a body that is not JSON", async () => {
    const { provider, client } = setup()

    await expect(provider.isWebhookEventValid(payload("not json"))).resolves.toBe(false)
    expect(client.verifyWebhookSignature).not.toHaveBeenCalled()
  })
})

describe("PayPalBase.getWebhookActionAndData", () => {
  it("maps PAYMENT.AUTHORIZATION.CREATED to authorized with the session from the authorization's custom_id", async () => {
    const { provider, client } = setup()

    await expect(
      provider.getWebhookActionAndData(payload(event("PAYMENT.AUTHORIZATION.CREATED", { custom_id: SESSION_ID })))
    ).resolves.toEqual({ action: PaymentActions.AUTHORIZED, data: { session_id: SESSION_ID, amount: "10.00" } })
    expect(client.getOrder).not.toHaveBeenCalled()
  })

  it("maps PAYMENT.CAPTURE.COMPLETED to captured with the session from the capture's custom_id", async () => {
    const { provider } = setup()

    await expect(
      provider.getWebhookActionAndData(payload(event("PAYMENT.CAPTURE.COMPLETED", { custom_id: SESSION_ID })))
    ).resolves.toEqual({ action: PaymentActions.SUCCESSFUL, data: { session_id: SESSION_ID, amount: "10.00" } })
  })

  it("takes the session from the order when the capture has no custom_id", async () => {
    const { provider, client } = setup()
    client.getOrder.mockResolvedValue(order({ status: "COMPLETED" }))

    const output = await provider.getWebhookActionAndData(
      payload(event("PAYMENT.CAPTURE.COMPLETED", { supplementary_data: { related_ids: { order_id: "ORDER-1" } } }))
    )

    expect(client.getOrder).toHaveBeenCalledWith("ORDER-1")
    expect(output).toEqual({ action: PaymentActions.SUCCESSFUL, data: { session_id: SESSION_ID, amount: "10.00" } })
  })

  it.each<[string, PaymentActions]>([
    ["PAYMENT.CAPTURE.DECLINED", PaymentActions.FAILED],
    ["PAYMENT.CAPTURE.DENIED", PaymentActions.FAILED],
    ["PAYMENT.CAPTURE.PENDING", PaymentActions.PENDING],
    ["PAYMENT.CAPTURE.REFUNDED", PaymentActions.CANCELED],
    ["PAYMENT.CAPTURE.REVERSED", PaymentActions.CANCELED],
    ["PAYMENT.AUTHORIZATION.VOIDED", PaymentActions.CANCELED],
  ])("maps %s to %s", async (eventType, action) => {
    const { provider } = setup()

    await expect(provider.getWebhookActionAndData(payload(event(eventType, { custom_id: SESSION_ID })))).resolves.toMatchObject({
      action,
      data: { session_id: SESSION_ID },
    })
  })

  it("logs that Medusa does not record a refund made in PayPal", async () => {
    const { provider, logger } = setup()

    await provider.getWebhookActionAndData(payload(event("PAYMENT.CAPTURE.REFUNDED", { custom_id: SESSION_ID })))

    expect(logger.info.mock.calls[0][0]).toContain("does not record refunds")
  })

  it.each(["CHECKOUT.ORDER.APPROVED", "CUSTOMER.DISPUTE.CREATED"])("does not support %s", async (eventType) => {
    const { provider } = setup()

    await expect(provider.getWebhookActionAndData(payload(event(eventType, { custom_id: SESSION_ID })))).resolves.toEqual({
      action: PaymentActions.NOT_SUPPORTED,
    })
  })

  it("does not support an event that fails verification", async () => {
    const { provider } = setup("FAILURE")

    await expect(
      provider.getWebhookActionAndData(payload(event("PAYMENT.CAPTURE.COMPLETED", { custom_id: SESSION_ID })))
    ).resolves.toEqual({ action: PaymentActions.NOT_SUPPORTED })
  })

  it("does not support an event without a session to tie it to", async () => {
    const { provider, logger } = setup()

    await expect(provider.getWebhookActionAndData(payload(event("PAYMENT.CAPTURE.COMPLETED")))).resolves.toEqual({
      action: PaymentActions.NOT_SUPPORTED,
    })
    expect(logger.warn).toHaveBeenCalled()
  })

  it("does not support a body that is not JSON", async () => {
    const { provider, client } = setup()

    await expect(provider.getWebhookActionAndData(payload("{oops"))).resolves.toEqual({
      action: PaymentActions.NOT_SUPPORTED,
    })
    expect(client.verifyWebhookSignature).not.toHaveBeenCalled()
  })

  it("throws when PayPal cannot verify, so the event bus retries", async () => {
    const { provider, client, logger } = setup()
    client.verifyWebhookSignature.mockRejectedValue(
      paypalError("verifyWebhookSignature", 500, { name: "INTERNAL_SERVER_ERROR" })
    )

    await expect(
      provider.getWebhookActionAndData(payload(event("PAYMENT.CAPTURE.COMPLETED", { custom_id: SESSION_ID })))
    ).rejects.toThrow("INTERNAL_SERVER_ERROR")
    expect(logger.error.mock.calls[0][0]).toContain("WH-EVENT-1")
  })
})
