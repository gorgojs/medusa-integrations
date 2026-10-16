/**
 * Live contract tests against the PayPal sandbox (https://api-m.sandbox.paypal.com).
 *
 * Purpose: catch changes in the Orders v2 and Payments v2 APIs that the nock-backed suites cannot see,
 * by running the plugin's own client (the generated one, from the built package) against PayPal.
 *
 * Opt-in: skipped unless CI_PAYPAL_CLIENT_ID and CI_PAYPAL_CLIENT_SECRET are set (a sandbox app from the
 * PayPal Developer Dashboard). CI_PAYPAL_WEBHOOK_ID, a webhook of the same app, adds the signature check.
 *
 *   CI_PAYPAL_CLIENT_ID=… CI_PAYPAL_CLIENT_SECRET=… yarn test:integration:http paypal-sandbox
 */
import { randomUUID } from "node:crypto"
import { PayPalApiError, PayPalClient } from "@gorgo/medusa-payment-paypal/lib/paypal-client"

jest.setTimeout(60 * 1000)

const CLIENT_ID = process.env.CI_PAYPAL_CLIENT_ID
const CLIENT_SECRET = process.env.CI_PAYPAL_CLIENT_SECRET
const WEBHOOK_ID = process.env.CI_PAYPAL_WEBHOOK_ID

const describeIfCreds = CLIENT_ID && CLIENT_SECRET ? describe : describe.skip
const itIfWebhook = WEBHOOK_ID ? it : it.skip

const logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } as any

describeIfCreds("PayPal contract (LIVE sandbox)", () => {
  let client: PayPalClient

  beforeAll(() => {
    client = new PayPalClient({ clientId: CLIENT_ID!, clientSecret: CLIENT_SECRET!, environment: "sandbox", logger })
  })

  const orderRequest = (reference: string) => ({
    intent: "CAPTURE" as const,
    purchase_units: [
      { reference_id: reference, custom_id: `payses_${reference}`, amount: { currency_code: "EUR", value: "10.00" } },
    ],
    payment_source: {
      paypal: {
        experience_context: { shipping_preference: "NO_SHIPPING" as const, user_action: "PAY_NOW" as const },
      },
    },
  })

  it("issues an access token", async () => {
    await expect(client.getAccessToken()).resolves.toEqual(expect.any(String))
  })

  it("creates an order, reads it back, patches its amount, and keeps the request id idempotent", async () => {
    const reference = `contract-${Date.now()}`
    const requestId = randomUUID()

    const created = await client.createOrder(orderRequest(reference) as any, requestId)
    expect(created.id).toEqual(expect.any(String))
    expect(["CREATED", "PAYER_ACTION_REQUIRED"]).toContain(created.status)
    expect(created.links?.some((link: { rel?: string }) => link.rel === "payer-action" || link.rel === "approve")).toBe(true)

    const again = await client.createOrder(orderRequest(reference) as any, requestId)
    expect(again.id).toBe(created.id)

    const read = await client.getOrder(created.id!)
    expect(read.purchase_units?.[0]).toMatchObject({
      reference_id: reference,
      custom_id: `payses_${reference}`,
      amount: { currency_code: "EUR", value: "10.00" },
    })

    // the order is still in its creation status (CREATED or PAYER_ACTION_REQUIRED), the one an express
    // checkout patches while the buyer changes the address in the PayPal window
    await client.patchOrder(created.id!, [
      {
        op: "replace",
        path: `/purchase_units/@reference_id=='${reference}'/amount`,
        value: { currency_code: "EUR", value: "12.50" },
      } as any,
    ])
    const patched = await client.getOrder(created.id!)
    expect(patched.purchase_units?.[0]?.amount?.value).toBe("12.50")
  })

  it("refuses to capture an order the buyer has not approved", async () => {
    const created = await client.createOrder(orderRequest(`contract-unapproved-${Date.now()}`) as any, randomUUID())

    const error = await client.captureOrder(created.id!, randomUUID()).catch((e: any) => e)

    expect(error).toBeInstanceOf(PayPalApiError)
    expect(error.status).toBe(422)
    expect(error.debugId).toEqual(expect.any(String))
  })

  it("reports an unknown capture on refund as a PayPal error with a debug id", async () => {
    const error = await client
      .refundCapture("0UNKNOWN0CAPTURE", { amount: { currency_code: "EUR", value: "1.00" } }, randomUUID())
      .catch((e: any) => e)

    expect(error).toBeInstanceOf(PayPalApiError)
    expect([404, 422]).toContain(error.status)
    expect(error.debugId).toEqual(expect.any(String))
  })

  itIfWebhook("answers FAILURE, not an error, for a forged webhook signature", async () => {
    const result = await client.verifyWebhookSignature(
      {
        auth_algo: "SHA256withRSA",
        cert_url: "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-1d93a270",
        transmission_id: randomUUID(),
        transmission_sig: "Zm9yZ2Vk",
        transmission_time: new Date().toISOString(),
        webhook_id: WEBHOOK_ID!,
      },
      JSON.stringify({ id: "WH-FORGED", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {} })
    )

    expect(result.verification_status).toBe("FAILURE")
  })
})
