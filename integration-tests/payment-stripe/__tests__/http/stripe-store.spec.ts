/**
 * Store route for the storefront: /store/stripe/config.
 *
 * The built package runs for real. medusaIntegrationTestRunner wipes the database after every test,
 * so each one seeds what it needs.
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { seedStripeIntegration } from "../utils/seed-stripe"
import { createAdminHeaders, createStoreHeaders, mockStripeNetwork, restoreStripeNetwork } from "../utils/fixtures"

jest.setTimeout(120 * 1000)

beforeAll(() => mockStripeNetwork())
afterAll(() => restoreStripeNetwork())

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: Record<string, string>

    beforeEach(async () => {
      const adminHeaders = await createAdminHeaders(getContainer())
      storeHeaders = await createStoreHeaders(api, adminHeaders)
    })

    describe("GET /store/stripe/config", () => {
      it("returns only the public settings of the only Stripe instance", async () => {
        await seedStripeIntegration(getContainer())

        const res = await api.get("/store/stripe/config", { headers: storeHeaders })

        expect(res.status).toBe(200)
        expect(res.data).toEqual({
          config: {
            provider_id: "int_stripe_stripe-1",
            publishable_key: "pk_test_nock",
            capture_method: "automatic_async",
            payment_method_configuration: null,
          },
        })
        const body = JSON.stringify(res.data)
        expect(body).not.toContain("sk_")
        expect(body).not.toContain("whsec_")
      })

      it("sends the capture method and the payment method configuration the provider uses", async () => {
        await seedStripeIntegration(getContainer(), { capture: "manual", paymentMethodConfiguration: "pmc_test_1" })

        const res = await api.get("/store/stripe/config", { headers: storeHeaders })

        expect(res.data.config).toMatchObject({ capture_method: "manual", payment_method_configuration: "pmc_test_1" })
        const body = JSON.stringify(res.data)
        expect(body).not.toContain("sk_")
        expect(body).not.toContain("whsec_")
      })

      it("accepts the instance's provider_id", async () => {
        await seedStripeIntegration(getContainer())

        const res = await api.get("/store/stripe/config?provider_id=int_stripe_stripe-1", { headers: storeHeaders })

        expect(res.status).toBe(200)
        expect(res.data.config.publishable_key).toBe("pk_test_nock")
      })

      it.each(["int_stripe_unknown", "int_tkassa_tkassa-1"])("answers 404 for provider_id %s", async (providerId) => {
        await seedStripeIntegration(getContainer())

        const res = await api.get(`/store/stripe/config?provider_id=${providerId}`, {
          headers: storeHeaders,
          validateStatus: () => true,
        })

        expect(res.status).toBe(404)
      })

      it("hides an instance that is not configured yet", async () => {
        const res = await api.get("/store/stripe/config", { headers: storeHeaders, validateStatus: () => true })

        expect(res.status).toBe(400)
        expect(JSON.stringify(res.data)).toContain("not available")
      })
    })
  },
})
