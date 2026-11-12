import { AUTHORIZENET_SIGNATURE_KEY } from "./webhooks"

export const AUTHORIZENET_INTEGRATION_PROVIDER_ID = "int_authorizenet_authorizenet-1"

/**
 * Seed a complete, enabled Authorize.net integration config directly via the integration module's
 * service (real DB + encryption), bypassing the Admin HTTP routes, as the Stripe suite does. Every
 * payment method resolves its options from this row at call time.
 */
export async function seedAuthorizeNetIntegration(container: any, overrides: Record<string, unknown> = {}) {
  const svc = container.resolve("integration")
  const descriptor = svc.getProviderDescriptor(AUTHORIZENET_INTEGRATION_PROVIDER_ID)
  const values = {
    environment: "sandbox",
    apiLoginId: process.env.AUTHORIZENET_API_LOGIN_ID || "nock-login",
    transactionKey: process.env.AUTHORIZENET_TRANSACTION_KEY || "nock-transaction-key",
    publicClientKey: process.env.AUTHORIZENET_CLIENT_KEY || "nock-client-key",
    signatureKey: AUTHORIZENET_SIGNATURE_KEY,
    capture: "automatic",
    googlePay: false,
    ...overrides,
  }
  const options = svc.encryptForStorage(descriptor, values)
  await svc.createIntegrations({
    provider_id: AUTHORIZENET_INTEGRATION_PROVIDER_ID,
    category: "payment",
    options,
    is_enabled: true,
  })
  svc.clearOptionsCache()
}
