import { createHmac, randomUUID } from "node:crypto"
import { Modules, PaymentActions } from "@medusajs/framework/utils"
import { processPaymentWorkflow } from "@medusajs/medusa/core-flows"

export const AUTHORIZENET_PROVIDER_ROUTE_KEY = "authorizenet_authorizenet"

export const AUTHORIZENET_SIGNATURE_KEY =
  process.env.AUTHORIZENET_SIGNATURE_KEY ||
  "a367989f131bf1e9b52ee9bc913f14e34d13b95c2a2d0f942f608041b09a0ad9e504d40f883e4f33515edabefe3fe0f6b6a98d95e34ecbf154ff32049ee7ed31"

/** A payment event the way Authorize.net delivers it. */
export function webhookEvent(eventType: string, payload: Record<string, unknown> = {}) {
  return {
    notificationId: randomUUID(),
    eventType,
    eventDate: "2026-10-28T10:00:00.000Z",
    webhookId: randomUUID(),
    payload: { entityName: "transaction", ...payload },
  }
}

/**
 * A webhook request signed the way Authorize.net signs it: the raw body as a Buffer and the
 * `x-anet-signature` header, `sha512=` and the upper-case hex of an HMAC-SHA512 over exactly those
 * bytes, with the Signature Key used as a UTF-8 string.
 */
export function signedWebhook(event: Record<string, unknown>, key = AUTHORIZENET_SIGNATURE_KEY) {
  const body = Buffer.from(JSON.stringify(event))
  const signature = createHmac("sha512", Buffer.from(key, "utf8")).update(body).digest("hex").toUpperCase()
  return { body, headers: { "content-type": "application/json", "x-anet-signature": `sha512=${signature}` } }
}

/**
 * Deliver an Authorize.net event the way Medusa's `payment-webhook` subscriber processes it: map it
 * through the provider, then run `processPaymentWorkflow` for the actions the core acts on. Runs
 * inline so the test does not wait for the event bus delay of the hooks route.
 */
export async function deliverWebhook(container: any, event: Record<string, unknown>) {
  const { body, headers } = signedWebhook(event)
  const paymentModule = container.resolve(Modules.PAYMENT)
  const result = await paymentModule.getWebhookActionAndData({
    provider: AUTHORIZENET_PROVIDER_ROUTE_KEY,
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
