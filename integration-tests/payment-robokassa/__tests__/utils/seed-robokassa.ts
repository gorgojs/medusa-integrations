const PROVIDER_ID = "int_robokassa_robokassa-1"

export async function seedRobokassaIntegration(
  container: any,
  overrides: Record<string, unknown> = {}
) {
  const svc = container.resolve("integration")
  const descriptor = svc.getProviderDescriptor(PROVIDER_ID)
  const values = {
    merchantLogin: process.env.ROBOKASSA_MERCHANT_LOGIN,
    hashAlgorithm: process.env.ROBOKASSA_HASH_ALGORITHM || "md5",
    password1: process.env.ROBOKASSA_PASSWORD_1,
    password2: process.env.ROBOKASSA_PASSWORD_2,
    capture: true,
    useReceipt: true,
    taxation: "osn",
    taxItemDefault: "none",
    taxShippingDefault: "none",
    ...overrides,
  }
  const options = svc.encryptForStorage(descriptor, values)
  await svc.createIntegrations({ provider_id: PROVIDER_ID, category: "payment", options, is_enabled: true })
  svc.clearOptionsCache()
}
