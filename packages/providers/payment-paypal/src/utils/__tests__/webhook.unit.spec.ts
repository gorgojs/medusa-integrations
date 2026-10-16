import { PaymentActions } from "@medusajs/framework/utils"
import { isPayPalCertUrl, readTransmission, readWebhookBody, REQUIRED_WEBHOOK_EVENTS, WEBHOOK_ACTIONS } from "../webhook"

const HEADERS = {
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-cert-url": "https://api-m.paypal.com/v1/notifications/certs/CERT-1",
  "paypal-transmission-id": "TX-1",
  "paypal-transmission-sig": "SIG",
  "paypal-transmission-time": "2026-10-12T10:00:00Z",
}

describe("readTransmission", () => {
  it("reads the five signature headers", () => {
    expect(readTransmission(HEADERS)).toEqual({
      auth_algo: "SHA256withRSA",
      cert_url: HEADERS["paypal-cert-url"],
      transmission_id: "TX-1",
      transmission_sig: "SIG",
      transmission_time: "2026-10-12T10:00:00Z",
    })
  })

  it("ignores header case and takes the first of repeated values", () => {
    const headers = { ...HEADERS, "PayPal-Transmission-Id": ["TX-2", "TX-3"] } as Record<string, unknown>
    delete headers["paypal-transmission-id"]

    expect(readTransmission(headers)?.transmission_id).toBe("TX-2")
  })

  it("returns null when a header is empty or missing", () => {
    expect(readTransmission({ ...HEADERS, "paypal-transmission-sig": "" })).toBeNull()
    expect(readTransmission(undefined)).toBeNull()
  })
})

describe("isPayPalCertUrl", () => {
  it.each([
    ["https://api.paypal.com/v1/notifications/certs/C", true],
    ["https://api-m.sandbox.paypal.com/v1/notifications/certs/C", true],
    ["https://API-M.PAYPAL.COM/v1/notifications/certs/C", true],
    ["https://paypal.com.evil.example/", false],
    ["https://evilpaypal.com/", false],
    ["ftp://api.paypal.com/", false],
  ])("%s → %s", (url, expected) => {
    expect(isPayPalCertUrl(url)).toBe(expected)
  })
})

describe("readWebhookBody", () => {
  it("keeps the raw text of a Buffer or a string next to the parsed event", () => {
    const raw = '{"id":"E1","event_type":"PAYMENT.CAPTURE.COMPLETED"}'

    expect(readWebhookBody(Buffer.from(raw))).toEqual({ raw, event: { id: "E1", event_type: "PAYMENT.CAPTURE.COMPLETED" } })
    expect(readWebhookBody(raw)?.raw).toBe(raw)
  })

  it.each([[undefined], [""], ["not json"], ["[1,2]"], ["null"], [{ id: "E1" }]])("returns null for %p", (rawData) => {
    expect(readWebhookBody(rawData)).toBeNull()
  })
})

describe("WEBHOOK_ACTIONS", () => {
  it("requires exactly the events Medusa acts on", () => {
    expect(REQUIRED_WEBHOOK_EVENTS).toEqual(["PAYMENT.AUTHORIZATION.CREATED", "PAYMENT.CAPTURE.COMPLETED"])
  })

  it("leaves the order approval out: it moves no money", () => {
    expect(WEBHOOK_ACTIONS["CHECKOUT.ORDER.APPROVED"]).toBeUndefined()
    expect(Object.values(WEBHOOK_ACTIONS)).not.toContain(PaymentActions.NOT_SUPPORTED)
  })
})
