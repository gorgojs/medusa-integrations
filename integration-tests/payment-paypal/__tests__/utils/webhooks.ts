import { Modules, PaymentActions } from "@medusajs/framework/utils"
import { processPaymentWorkflow } from "@medusajs/medusa/core-flows"
import nock from "nock"
import { PAYPAL_API } from "./fixtures"

export const PAYPAL_PROVIDER_ROUTE_KEY = "paypal_paypal"

export const SIGNED_HEADERS = {
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-cert-url": "https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-1d93a270",
  "paypal-transmission-id": "TX-1",
  "paypal-transmission-sig": "SIG",
  "paypal-transmission-time": "2026-10-12T10:00:00Z",
}

export function webhookEvent(eventType: string, resource: Record<string, unknown>) {
  return { id: `WH-${eventType}`, event_type: eventType, resource_type: "capture", resource }
}

/** PayPal answers the signature check; returns the bodies the provider sent it. */
export function mockSignatureCheck(status = "SUCCESS") {
  const bodies: string[] = []
  nock(PAYPAL_API)
    .post("/v1/notifications/verify-webhook-signature")
    .reply(200, (_uri: string, body: unknown) => {
      bodies.push(typeof body === "string" ? body : JSON.stringify(body))
      return { verification_status: status }
    })
  return bodies
}

/**
 * Deliver a PayPal event the way Medusa's `payment-webhook` subscriber processes it: map it through
 * the provider, then run `processPaymentWorkflow` for the actions the core acts on. Runs inline so the
 * test does not wait for the event bus delay of the hooks route.
 */
export async function deliverWebhook(container: any, event: Record<string, unknown>) {
  const raw = JSON.stringify(event)
  const paymentModule = container.resolve(Modules.PAYMENT)
  const result = await paymentModule.getWebhookActionAndData({
    provider: PAYPAL_PROVIDER_ROUTE_KEY,
    payload: { data: event, rawData: Buffer.from(raw), headers: SIGNED_HEADERS },
  })
  if (
    result.data?.session_id &&
    (result.action === PaymentActions.AUTHORIZED || result.action === PaymentActions.SUCCESSFUL)
  ) {
    await processPaymentWorkflow(container).run({ input: result })
  }
  return result
}
