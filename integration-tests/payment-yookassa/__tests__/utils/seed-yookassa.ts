const PROVIDER_ID = "int_yookassa"

export async function seedYookassaIntegration(
  container: any,
  overrides: Record<string, unknown> = {}
) {
  const svc = container.resolve("integration")
  const descriptor = svc.getProviderDescriptor(PROVIDER_ID)
  const values = {
    shopId: process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY,
    capture: false,
    useReceipt: false,
    taxItemDefault: 1,
    taxShippingDefault: 1,
    ...overrides,
  }
  const options = svc.encryptForStorage(descriptor, values)
  await svc.createIntegrations({ provider_id: PROVIDER_ID, category: "payment", options, is_enabled: true })
  svc.clearOptionsCache()
}
