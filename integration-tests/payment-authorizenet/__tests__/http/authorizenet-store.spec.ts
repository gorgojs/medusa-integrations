/**
 * Store route for the storefront: /store/authorizenet/config.
 *
 * The built package runs for real. medusaIntegrationTestRunner wipes the database after every test,
 * so each one seeds what it needs. The Google Pay gateway id is cached in memory by the package for
 * ten minutes and the cache outlives a test, so a test counts the calls it made itself.
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import nock from "nock"
import { seedAuthorizeNetIntegration } from "../utils/seed-authorizenet"
import {
  createAdminHeaders,
  createStoreHeaders,
  mockAnet,
  mockAnetNetwork,
  merchantDetails,
  restoreAnetNetwork,
} from "../utils/fixtures"

jest.setTimeout(120 * 1000)

beforeAll(() => mockAnetNetwork())
afterAll(() => restoreAnetNetwork())

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: Record<string, string>

    beforeEach(async () => {
      const adminHeaders = await createAdminHeaders(getContainer())
      storeHeaders = await createStoreHeaders(api, adminHeaders)
    })
    afterEach(() => {
      nock.abortPendingRequests()
      nock.cleanAll()
    })

    describe("GET /store/authorizenet/config", () => {
      it("returns only the public settings of the only Authorize.net instance", async () => {
        await seedAuthorizeNetIntegration(getContainer())

        const res = await api.get("/store/authorizenet/config", { headers: storeHeaders })

        expect(res.status).toBe(200)
        expect(res.data).toEqual({
          config: {
            provider_id: "int_authorizenet_authorizenet-1",
            environment: "sandbox",
            api_login_id: "nock-login",
            client_key: "nock-client-key",
            google_pay: null,
          },
        })
        const body = JSON.stringify(res.data)
        expect(body).not.toContain("nock-transaction-key")
        expect(body).not.toContain(process.env.AUTHORIZENET_SIGNATURE_KEY as string)
      })

      it("accepts the instance's provider_id", async () => {
        await seedAuthorizeNetIntegration(getContainer())

        const res = await api.get("/store/authorizenet/config?provider_id=int_authorizenet_authorizenet-1", {
          headers: storeHeaders,
        })

        expect(res.status).toBe(200)
        expect(res.data.config.client_key).toBe("nock-client-key")
      })

      it.each(["int_authorizenet_unknown", "int_stripe_stripe-1"])("answers 404 for provider_id %s", async (providerId) => {
        await seedAuthorizeNetIntegration(getContainer())

        const res = await api.get(`/store/authorizenet/config?provider_id=${providerId}`, {
          headers: storeHeaders,
          validateStatus: () => true,
        })

        expect(res.status).toBe(404)
      })

      it("hides an instance that is not configured yet", async () => {
        const res = await api.get("/store/authorizenet/config", { headers: storeHeaders, validateStatus: () => true })

        expect(res.status).toBe(400)
        expect(JSON.stringify(res.data)).toContain("not available")
      })

      it("reads the Google Pay gateway id from the account once and reuses it", async () => {
        await seedAuthorizeNetIntegration(getContainer(), { googlePay: true })
        const { calls } = mockAnet({ getMerchantDetailsRequest: () => merchantDetails() })

        const first = await api.get("/store/authorizenet/config", { headers: storeHeaders })
        const second = await api.get("/store/authorizenet/config", { headers: storeHeaders })

        const expected = { environment: "TEST", gateway_merchant_id: "123456", merchant_id: null }
        expect(first.data.config.google_pay).toEqual(expected)
        expect(second.data.config.google_pay).toEqual(expected)
        expect(calls.filter((c) => c.root === "getMerchantDetailsRequest")).toHaveLength(1)
        expect(calls.every((c) => c.root === "getMerchantDetailsRequest")).toBe(true)
        expect(JSON.stringify(first.data)).not.toContain("nock-transaction-key")
      })

      it("turns Google Pay off and still answers 200 when the account cannot be read", async () => {
        // another account than the test above, whose gateway id may still sit in the cache
        await seedAuthorizeNetIntegration(getContainer(), { googlePay: true, apiLoginId: "nock-login-failing" })
        // no responder: the mock answers 500
        const { calls } = mockAnet({})

        const res = await api.get("/store/authorizenet/config", { headers: storeHeaders })

        expect(res.status).toBe(200)
        expect(res.data.config.google_pay).toBeNull()
        expect(res.data.config.api_login_id).toBe("nock-login-failing")
        expect(calls.length).toBeGreaterThan(0)
        expect(calls.every((c) => c.root === "getMerchantDetailsRequest")).toBe(true)
      })
    })
  },
})
