export const MOLLIE_INTEGRATION_PROVIDER_ID = "int_mollie_mollie-1"
export const MOLLIE_WEBHOOK_URL = "https://api.example.com/hooks/payment/mollie_mollie"
export const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY || "test_nockNockNockNockNockNockNockNockNo"

/**
 * Seed a complete, enabled Mollie integration config directly via the integration module's service
 * (real DB + encryption), bypassing the Admin HTTP routes, as the other payment suites do. Every
 * payment method resolves its options from this row at call time.
 */
export async function seedMollieIntegration(container: any, overrides: Record<string, unknown> = {}) {
  const svc = container.resolve("integration")
  const descriptor = svc.getProviderDescriptor(MOLLIE_INTEGRATION_PROVIDER_ID)
  const values = {
    apiKey: MOLLIE_API_KEY,
    webhookUrl: MOLLIE_WEBHOOK_URL,
    capture: "automatic",
    ...overrides,
  }
  const options = svc.encryptForStorage(descriptor, values)
  await svc.createIntegrations({
    provider_id: MOLLIE_INTEGRATION_PROVIDER_ID,
    category: "payment",
    options,
    is_enabled: true,
  })
  svc.clearOptionsCache()
}
