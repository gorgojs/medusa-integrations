import { buildStorefrontConfig, clearStorefrontConfigCache } from "../storefront-config"

const TEN_MINUTES = 10 * 60 * 1000

const BASE_OPTIONS = {
  environment: "sandbox",
  apiLoginId: "login-1",
  transactionKey: "TRANSACTION-KEY-SECRET",
  publicClientKey: "client-key-1",
  signatureKey: "SIGNATURE-KEY-SECRET",
  capture: "automatic",
  googlePay: false,
} as any

function setup(gatewayId?: string | null) {
  gatewayId = gatewayId === undefined ? "gateway-1" : (gatewayId ?? undefined)
  const client = { getMerchantDetails: jest.fn().mockResolvedValue({ messages: {}, gatewayId }) }
  const logger = { warn: jest.fn() }
  return { client, logger }
}

describe("buildStorefrontConfig", () => {
  beforeEach(() => clearStorefrontConfigCache())

  it("returns the public settings and no Google Pay block when it is off", async () => {
    const { client, logger } = setup()

    const config = await buildStorefrontConfig({
      providerId: "int_authorizenet_a",
      options: BASE_OPTIONS,
      client,
      logger,
    })

    expect(config).toEqual({
      provider_id: "int_authorizenet_a",
      environment: "sandbox",
      api_login_id: "login-1",
      client_key: "client-key-1",
      google_pay: null,
    })
    expect(client.getMerchantDetails).not.toHaveBeenCalled()
  })

  it("defaults the environment to sandbox", async () => {
    const { client, logger } = setup()

    const config = await buildStorefrontConfig({
      providerId: "int_authorizenet",
      options: { ...BASE_OPTIONS, environment: undefined },
      client,
      logger,
    })

    expect(config.environment).toBe("sandbox")
  })

  it("gives the TEST environment with the gateway id in the sandbox", async () => {
    const { client, logger } = setup("gateway-1")

    const config = await buildStorefrontConfig({
      providerId: "int_authorizenet",
      options: { ...BASE_OPTIONS, googlePay: true },
      client,
      logger,
    })

    expect(config.google_pay).toEqual({ environment: "TEST", gateway_merchant_id: "gateway-1", merchant_id: null })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("gives the PRODUCTION environment with the Google merchant id", async () => {
    const { client, logger } = setup("gateway-1")

    const config = await buildStorefrontConfig({
      providerId: "int_authorizenet",
      options: { ...BASE_OPTIONS, environment: "production", googlePay: true, googleMerchantId: "BCR2DN4T" },
      client,
      logger,
    })

    expect(config.environment).toBe("production")
    expect(config.google_pay).toEqual({
      environment: "PRODUCTION",
      gateway_merchant_id: "gateway-1",
      merchant_id: "BCR2DN4T",
    })
  })

  it("reads the gateway id once within ten minutes and again after them", async () => {
    const { client, logger } = setup()
    let time = 1_000_000
    const run = () =>
      buildStorefrontConfig({
        providerId: "int_authorizenet",
        options: { ...BASE_OPTIONS, googlePay: true },
        client,
        logger,
        now: () => time,
      })

    await run()
    time += TEN_MINUTES - 1
    const cached = await run()
    expect(client.getMerchantDetails).toHaveBeenCalledTimes(1)
    expect(cached.google_pay?.gateway_merchant_id).toBe("gateway-1")

    time += 1
    await run()
    expect(client.getMerchantDetails).toHaveBeenCalledTimes(2)
  })

  it("does not serve another API Login ID or environment from the cache", async () => {
    const { client, logger } = setup()
    const run = (options: Record<string, unknown>) =>
      buildStorefrontConfig({
        providerId: "int_authorizenet",
        options: { ...BASE_OPTIONS, googlePay: true, ...options },
        client,
        logger,
      })

    await run({})
    await run({ apiLoginId: "login-2" })
    await run({ environment: "production" })

    expect(client.getMerchantDetails).toHaveBeenCalledTimes(3)
  })

  it("turns Google Pay off and warns when the account read fails", async () => {
    const { client, logger } = setup()
    client.getMerchantDetails.mockRejectedValue(new Error("E00007 User authentication failed"))

    const config = await buildStorefrontConfig({
      providerId: "int_authorizenet",
      options: { ...BASE_OPTIONS, googlePay: true },
      client,
      logger,
    })

    expect(config.google_pay).toBeNull()
    expect(config.api_login_id).toBe("login-1")
    expect(logger.warn).toHaveBeenCalledTimes(1)
    expect(logger.warn.mock.calls[0][0]).toContain("E00007 User authentication failed")
  })

  it("turns Google Pay off and warns when the account has no gateway id, without caching it", async () => {
    const { client, logger } = setup(null)
    const run = () =>
      buildStorefrontConfig({
        providerId: "int_authorizenet",
        options: { ...BASE_OPTIONS, googlePay: true },
        client,
        logger,
      })

    expect((await run()).google_pay).toBeNull()
    expect(logger.warn.mock.calls[0][0]).toContain("no gateway id")

    client.getMerchantDetails.mockResolvedValue({ messages: {}, gatewayId: "gateway-2" })
    expect((await run()).google_pay?.gateway_merchant_id).toBe("gateway-2")
  })

  it("never contains the transaction key or the signature key", async () => {
    const { client, logger } = setup()

    const config = await buildStorefrontConfig({
      providerId: "int_authorizenet",
      options: { ...BASE_OPTIONS, googlePay: true, googleMerchantId: "BCR2DN4T" },
      client,
      logger,
    })

    const json = JSON.stringify(config)
    expect(json).not.toContain(BASE_OPTIONS.transactionKey)
    expect(json).not.toContain(BASE_OPTIONS.signatureKey)
    expect(json).not.toMatch(/transaction|signature/i)
  })
})
