export const PAYPAL_INTEGRATION_PROVIDER_ID = "int_paypal_paypal-1"

/**
 * Seed a complete, enabled PayPal integration config directly via the integration module's service
 * (real DB + encryption), bypassing the Admin HTTP routes, as the T-Kassa suite does. Every payment
 * method resolves its options from this row at call time.
 */
export async function seedPayPalIntegration(container: any, overrides: Record<string, unknown> = {}) {
  const svc = container.resolve("integration")
  const descriptor = svc.getProviderDescriptor(PAYPAL_INTEGRATION_PROVIDER_ID)
  const values = {
    environment: "sandbox",
    clientId: process.env.PAYPAL_CLIENT_ID || "test-client-id",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "test-client-secret",
    webhookId: process.env.PAYPAL_WEBHOOK_ID || "WH-TEST",
    intent: "capture",
    ...overrides,
  }
  const options = svc.encryptForStorage(descriptor, values)
  await svc.createIntegrations({
    provider_id: PAYPAL_INTEGRATION_PROVIDER_ID,
    category: "payment",
    options,
    is_enabled: true,
  })
  svc.clearOptionsCache()
}
