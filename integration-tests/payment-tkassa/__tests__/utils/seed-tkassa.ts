const PROVIDER_ID = "int_tkassa"

/**
 * Seed a complete, enabled T-Kassa integration config directly via the integration module's
 * service (real DB + encryption), bypassing the Admin HTTP routes — same pattern the
 * `medusa-integration` package's own integration tests use. `resolveOptions()` (called by
 * every payment method on the migrated provider) only resolves once a config row like this
 * exists and passes full validation.
 */
export async function seedTkassaIntegration(
  container: any,
  overrides: Record<string, unknown> = {}
) {
  const svc = container.resolve("integration")
  const descriptor = svc.getProviderDescriptor(PROVIDER_ID)
  const values = {
    terminalKey: process.env.TKASSA_TERMINAL_KEY,
    password: process.env.TKASSA_PASSWORD,
    capture: true,
    useReceipt: true,
    ffdVersion: "1.05",
    taxation: "osn",
    taxItemDefault: "none",
    taxShippingDefault: "none",
    ...overrides,
  }
  const options = svc.encryptForStorage(descriptor, values)
  await svc.createIntegrations({ provider_id: PROVIDER_ID, category: "payment", options, is_enabled: true })
  svc.clearOptionsCache()
}
