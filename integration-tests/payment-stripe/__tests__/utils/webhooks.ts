import { Modules, PaymentActions } from "@medusajs/framework/utils"
import { processPaymentWorkflow } from "@medusajs/medusa/core-flows"
import Stripe from "stripe"

export const STRIPE_PROVIDER_ROUTE_KEY = "stripe_stripe"

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_nock"

// only its local `webhooks` helper is used: no request reaches Stripe
const stripe = new Stripe("sk_test_x")

/** A PaymentIntent event the way Stripe delivers it. */
export function webhookEvent(type: string, object: Record<string, unknown>) {
  return { id: `evt_${type}`, object: "event", type, data: { object } }
}

/**
 * A webhook request signed the way Stripe signs it: the raw body as a Buffer and the
 * `stripe-signature` header computed over exactly those bytes.
 */
export function signedWebhook(event: Record<string, unknown>, secret = STRIPE_WEBHOOK_SECRET) {
  const body = Buffer.from(JSON.stringify(event))
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body.toString(), secret })
  return { body, headers: { "content-type": "application/json", "stripe-signature": signature } }
}

/**
 * Deliver a Stripe event the way Medusa's `payment-webhook` subscriber processes it: map it through
 * the provider, then run `processPaymentWorkflow` for the actions the core acts on. Runs inline so the
 * test does not wait for the event bus delay of the hooks route.
 */
export async function deliverWebhook(container: any, event: Record<string, unknown>) {
  const { body, headers } = signedWebhook(event)
  const paymentModule = container.resolve(Modules.PAYMENT)
  const result = await paymentModule.getWebhookActionAndData({
    provider: STRIPE_PROVIDER_ROUTE_KEY,
    payload: { data: event, rawData: body, headers },
  })
  if (
    result.data?.session_id &&
    (result.action === PaymentActions.AUTHORIZED || result.action === PaymentActions.SUCCESSFUL)
  ) {
    await processPaymentWorkflow(container).run({ input: result })
  }
  return result
}
