import { PaymentWebhookEvents, Modules } from "@medusajs/framework/utils"
import { TestEventUtils } from "@medusajs/test-utils"

export const MOLLIE_WEBHOOK_ROUTE = "/hooks/payment/mollie_mollie"

/**
 * Deliver a classic Mollie webhook the way Mollie does: a form body `id=tr_…`, no signature, to the
 * core route. The route only emits an event, and the payment-webhook subscriber processes it after
 * the module's delay (5 seconds by default), so this waits for that subscriber to finish before it
 * returns. The returned `status` is the route's answer.
 */
export async function postWebhook(api: any, container: any, paymentId: string): Promise<number> {
  const eventBus = container.resolve(Modules.EVENT_BUS)
  const processed = TestEventUtils.waitSubscribersExecution(PaymentWebhookEvents.WebhookReceived, eventBus, {
    timeout: 60_000,
  })
  const res = await api.post(MOLLIE_WEBHOOK_ROUTE, new URLSearchParams({ id: paymentId }).toString(), {
    headers: { "content-type": "application/x-www-form-urlencoded" },
    validateStatus: () => true,
  })
  if (res.status === 200) {
    await processed
  } else {
    processed.catch(() => undefined)
  }
  return res.status
}
