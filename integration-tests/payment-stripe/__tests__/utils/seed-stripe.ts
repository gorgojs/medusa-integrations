export const STRIPE_INTEGRATION_PROVIDER_ID = "int_stripe_stripe-1"

/**
 * Seed a complete, enabled Stripe integration config directly via the integration module's service
 * (real DB + encryption), bypassing the Admin HTTP routes, as the T-Kassa suite does. Every payment
 * method resolves its options from this row at call time.
 */
export async function seedStripeIntegration(container: any, overrides: Record<string, unknown> = {}) {
  const svc = container.resolve("integration")
  const descriptor = svc.getProviderDescriptor(STRIPE_INTEGRATION_PROVIDER_ID)
  const values = {
    secretKey: process.env.STRIPE_SECRET_KEY || "sk_test_nock",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "pk_test_nock",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "whsec_nock",
    capture: "automatic",
    ...overrides,
  }
  const options = svc.encryptForStorage(descriptor, values)
  await svc.createIntegrations({
    provider_id: STRIPE_INTEGRATION_PROVIDER_ID,
    category: "payment",
    options,
    is_enabled: true,
  })
  svc.clearOptionsCache()
}
