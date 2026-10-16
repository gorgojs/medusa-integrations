/**
 * Store routes for the storefront: /store/paypal/config and /store/paypal/orders/:order_id/payer.
 *
 * The real generated client runs from the built package; nock answers PayPal. medusaIntegrationTestRunner
 * wipes the database after every test, so each one seeds what it needs.
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import nock from "nock"
import { seedPayPalIntegration } from "../utils/seed-paypal"
import {
  createAdminHeaders,
  createPayPalCart,
  createStoreHeaders,
  mockPayPalNetwork,
  PAYPAL_API,
  paypalOrder,
  restorePayPalNetwork,
} from "../utils/fixtures"

jest.setTimeout(120 * 1000)

beforeAll(() => mockPayPalNetwork())
afterAll(() => restorePayPalNetwork())

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: Record<string, string>

    beforeEach(async () => {
      const adminHeaders = await createAdminHeaders(getContainer())
      storeHeaders = await createStoreHeaders(api, adminHeaders)
    })

    describe("GET /store/paypal/config", () => {
      it("returns only the public settings of the only PayPal instance", async () => {
        await seedPayPalIntegration(getContainer(), { intent: "authorize" })

        const res = await api.get("/store/paypal/config", { headers: storeHeaders })

        expect(res.status).toBe(200)
        expect(res.data).toEqual({
          config: {
            provider_id: "int_paypal_paypal-1",
            client_id: "test-client-id",
            environment: "sandbox",
            intent: "authorize",
          },
        })
        const body = JSON.stringify(res.data)
        expect(body).not.toContain("test-client-secret")
        expect(body).not.toContain("WH-TEST")
      })

      it("accepts the instance's provider_id", async () => {
        await seedPayPalIntegration(getContainer())

        const res = await api.get("/store/paypal/config?provider_id=int_paypal_paypal-1", { headers: storeHeaders })

        expect(res.data.config.client_id).toBe("test-client-id")
      })

      it.each(["int_paypal_unknown", "int_tkassa_tkassa-1"])("answers 404 for provider_id %s", async (providerId) => {
        await seedPayPalIntegration(getContainer())

        const res = await api.get(`/store/paypal/config?provider_id=${providerId}`, {
          headers: storeHeaders,
          validateStatus: () => true,
        })

        expect(res.status).toBe(404)
      })

      it("hides an instance that is not configured yet", async () => {
        const res = await api.get("/store/paypal/config", { headers: storeHeaders, validateStatus: () => true })

        expect(res.status).toBe(400)
        expect(JSON.stringify(res.data)).toContain("not available")
      })
    })

    describe("GET /store/paypal/orders/:order_id/payer", () => {
      const approvedWithPayer = (collectionId: string) =>
        paypalOrder(
          collectionId,
          "payses_x",
          {
            status: "APPROVED",
            payer: {
              email_address: "buyer@example.com",
              name: { given_name: "Anna", surname: "Smith" },
            },
          },
          {
            shipping: {
              name: { full_name: "Anna Smith" },
              address: { address_line_1: "Main St 1", admin_area_2: "Berlin", postal_code: "10115", country_code: "DE" },
            },
          }
        )

      it("returns the buyer of an order created for this cart", async () => {
        await seedPayPalIntegration(getContainer())
        const { cartId, collectionId } = await createPayPalCart(getContainer())
        nock(PAYPAL_API).get("/v2/checkout/orders/ORDER-1").reply(200, approvedWithPayer(collectionId))

        const res = await api.get(`/store/paypal/orders/ORDER-1/payer?cart_id=${cartId}`, { headers: storeHeaders })

        expect(res.status).toBe(200)
        expect(res.data.payer).toEqual({
          amount: { currency_code: "EUR", value: "10.00" },
          email: "buyer@example.com",
          phone: null,
          shipping_address: {
            first_name: "Anna",
            last_name: "Smith",
            address_1: "Main St 1",
            address_2: null,
            city: "Berlin",
            province: null,
            postal_code: "10115",
            country_code: "de",
            phone: null,
          },
        })
      })

      it("answers 404 for an order of another cart", async () => {
        await seedPayPalIntegration(getContainer())
        const { cartId } = await createPayPalCart(getContainer())
        nock(PAYPAL_API).get("/v2/checkout/orders/ORDER-1").reply(200, approvedWithPayer("pay_col_someone_else"))

        const res = await api.get(`/store/paypal/orders/ORDER-1/payer?cart_id=${cartId}`, {
          headers: storeHeaders,
          validateStatus: () => true,
        })

        expect(res.status).toBe(404)
        expect(JSON.stringify(res.data)).not.toContain("Main St 1")
      })

      it("answers 404 for an order PayPal does not know", async () => {
        await seedPayPalIntegration(getContainer())
        const { cartId } = await createPayPalCart(getContainer())
        nock(PAYPAL_API)
          .get("/v2/checkout/orders/ORDER-404")
          .reply(404, { name: "RESOURCE_NOT_FOUND", details: [{ issue: "INVALID_RESOURCE_ID" }] })

        const res = await api.get(`/store/paypal/orders/ORDER-404/payer?cart_id=${cartId}`, {
          headers: storeHeaders,
          validateStatus: () => true,
        })

        expect(res.status).toBe(404)
      })

      it("answers 404 for an unknown cart", async () => {
        await seedPayPalIntegration(getContainer())

        const res = await api.get("/store/paypal/orders/ORDER-1/payer?cart_id=cart_unknown", {
          headers: storeHeaders,
          validateStatus: () => true,
        })

        expect(res.status).toBe(404)
      })

      it("needs the cart id", async () => {
        const res = await api.get("/store/paypal/orders/ORDER-1/payer", {
          headers: storeHeaders,
          validateStatus: () => true,
        })

        expect(res.status).toBe(400)
      })
    })
  },
})
