/**
 * Integration tests for store API: /store/apiship/* and /store/shipping-methods/*
 *
 * External ApiShip HTTP calls are intercepted by nock so all tests are always-on
 * and deterministic — no CI_APISHIP_TOKEN required.
 *
 * The full stack is exercised: route → workflow → createApishipClient → nock.
 *
 * State management:
 *   medusaIntegrationTestRunner wipes the DB after every it() block.
 *   Each test is fully self-contained.
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createShippingProfilesWorkflow,
  createShippingOptionsWorkflow,
  createShippingOptionTypesWorkflow,
} from "@medusajs/medusa/core-flows"
import nock from "nock"
import jwt from "jsonwebtoken"

jest.setTimeout(120 * 1000)

// Matches the named instance declared in medusa-config.ts (APISHIP_INTEGRATION_ID).
const PROVIDER_ID = "int_apiship_apiship-1"

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_PROVIDERS = [
  { key: "cdek", name: "CDEK" },
  { key: "boxberry", name: "Boxberry" },
]

const MOCK_POINTS = [
  { id: 1, providerKey: "cdek", address: "Москва, ул. Ленина 1" },
  { id: 2, providerKey: "cdek", address: "Москва, ул. Мира 5" },
  { id: 3, providerKey: "boxberry", address: "СПб, Невский 10" },
]

// ---------------------------------------------------------------------------
// nock — intercepts external ApiShip HTTP calls
// Base URL for test mode: http://api.dev.apiship.ru/v1
// All other requests (DB, Redis, localhost test server) pass through.
// ---------------------------------------------------------------------------
const APISHIP_HOST = "http://api.dev.apiship.ru"

beforeAll(() => {
  nock(APISHIP_HOST)
    .persist()
    .get("/v1/lists/providers")
    .reply(200, { rows: MOCK_PROVIDERS })

  nock(APISHIP_HOST)
    .persist()
    .get("/v1/lists/points")
    .query(true)
    .reply(200, function (this: any) {
      const params = this.req.path.split("?")[1] ?? ""
      const searchParams = new URLSearchParams(params)
      const filter = searchParams.get("filter") ?? ""
      const limit = parseInt(searchParams.get("limit") ?? "10")

      const rows = filter.includes("providerKey=cdek")
        ? MOCK_POINTS.filter((p) => p.providerKey === "cdek")
        : MOCK_POINTS

      return { rows: rows.slice(0, limit) }
    })
})

afterAll(() => {
  nock.cleanAll()
  nock.restore()
})

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
// Credentials belong to the integration descriptor's `credentials` section; only the
// plugin-owned `settings` blob goes through /admin/apiship/options.
const BASE_CREDENTIALS = { token: "nock-fake-token", is_test: true as const }
const BASE_SENDER = {
  sender_country_code: "RU",
  sender_address_string: "Москва, Тверская, 1",
  sender_contact_name: "Test User",
  sender_phone: "+70000000000",
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    const adminHeaders: Record<string, string> = {}
    const storeHeaders: Record<string, string> = {}
    // Store routes never name an instance directly — they pass the shipping option they are
    // checking out with and the server derives the ApiShip instance from it.
    let shippingOptionId: string

    beforeEach(async () => {
      const container = getContainer()
      const auth = container.resolve("auth") as any
      const userService = container.resolve("user") as any

      const user = await userService.createUsers({ email: "admin@test.com" })
      const authIdentity = await auth.createAuthIdentities({
        provider_identities: [
          {
            provider: "emailpass",
            entity_id: "admin@test.com",
            provider_metadata: { password: "supersecret" },
          },
        ],
        app_metadata: { user_id: user.id },
      })

      const jwtToken = jwt.sign(
        {
          actor_id: user.id,
          actor_type: "user",
          auth_identity_id: authIdentity.id,
        },
        "supersecret",
        { expiresIn: "1d" }
      )
      adminHeaders["authorization"] = `Bearer ${jwtToken}`

      const keyRes = await api.post(
        "/admin/api-keys",
        { title: "test-store-key", type: "publishable" },
        { headers: adminHeaders }
      )
      storeHeaders["x-publishable-api-key"] = keyRes.data.api_key.token

      await api.post(
        `/admin/integrations/${PROVIDER_ID}`,
        { section_id: "credentials", values: BASE_CREDENTIALS },
        { headers: adminHeaders }
      )
      await api.post(
        `/admin/integrations/${PROVIDER_ID}`,
        { section_id: "sender", values: BASE_SENDER },
        { headers: adminHeaders }
      )

      shippingOptionId = await createApishipShippingOption()
    })

    const createApishipShippingOption = async () => {
      const container = getContainer()
      const link = container.resolve(ContainerRegistrationKeys.LINK)
      const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT) as any
      const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION) as any

      const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
        name: "Test set",
        type: "shipping",
        service_zones: [
          { name: "RU", geo_zones: [{ country_code: "ru", type: "country" }] },
        ],
      })

      const stockLocation = await stockLocationModuleService.createStockLocations({
        name: "Test warehouse",
      })

      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
      })
      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: "apiship_apiship" },
      })

      const { result: shippingProfiles } = await createShippingProfilesWorkflow(
        container
      ).run({ input: { data: [{ name: "Default", type: "default" }] } })

      const { result: shippingOptionTypes } = await createShippingOptionTypesWorkflow(
        container
      ).run({
        input: {
          shipping_option_types: [
            { label: "ApiShip", code: "apiship", description: "ApiShip delivery" },
          ],
        },
      })

      const { result: shippingOptions } = await createShippingOptionsWorkflow(
        container
      ).run({
        input: [
          {
            name: "By courier",
            price_type: "calculated",
            provider_id: "apiship_apiship",
            type_id: shippingOptionTypes[0].id,
            service_zone_id: fulfillmentSet.service_zones[0].id,
            shipping_profile_id: shippingProfiles[0].id,
            data: { id: "apiship_doortodoor", deliveryType: 1, pickupType: 1 },
            rules: [],
          },
        ],
      })

      return shippingOptions[0].id
    }

    // -------------------------------------------------------------------------
    // DELETE /store/shipping-methods/:sm_id
    // -------------------------------------------------------------------------
    describe("DELETE /store/shipping-methods/:sm_id", () => {
      it("returns 200 with deleted response for a non-existent id (idempotent)", async () => {
        const id = "sm_does_not_exist"
        const res = await api.delete(
          `/store/shipping-methods/${id}`,
          { headers: storeHeaders }
        )

        expect(res.status).toBe(200)
        expect(res.data.id).toBe(id)
        expect(res.data.object).toBe("shipping_method")
        expect(res.data.deleted).toBe(true)
      })
    })

    // -------------------------------------------------------------------------
    // POST /store/apiship/:shipping_option_id/calculate
    // -------------------------------------------------------------------------
    describe("POST /store/apiship/:shipping_option_id/calculate", () => {
      it("returns 400 when cart_id is missing from the request body", async () => {
        const res = await api
          .post(
            "/store/apiship/so_fakeoption/calculate",
            {},
            { headers: storeHeaders }
          )
          .catch((err: any) => err.response)

        expect(res.status).toBe(400)
      })
    })

    // -------------------------------------------------------------------------
    // GET /store/apiship/providers
    // -------------------------------------------------------------------------
    describe("GET /store/apiship/providers", () => {
      it("returns a non-empty providers array", async () => {
        const res = await api.get(`/store/apiship/providers?shipping_option_id=${shippingOptionId}`, { headers: storeHeaders })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.providers)).toBe(true)
        expect(res.data.providers.length).toBeGreaterThan(0)
      })

      it("each provider has key and name fields", async () => {
        const res = await api.get(`/store/apiship/providers?shipping_option_id=${shippingOptionId}`, { headers: storeHeaders })

        for (const provider of res.data.providers) {
          expect(typeof provider.key).toBe("string")
          expect(typeof provider.name).toBe("string")
        }
      })

      it("well-known providers are present (cdek, boxberry)", async () => {
        const res = await api.get(`/store/apiship/providers?shipping_option_id=${shippingOptionId}`, { headers: storeHeaders })
        const keys = res.data.providers.map((p: any) => p.key)

        expect(keys).toContain("cdek")
        expect(keys).toContain("boxberry")
      })
    })

    // -------------------------------------------------------------------------
    // GET /store/apiship/points
    // -------------------------------------------------------------------------
    describe("GET /store/apiship/points", () => {
      it("returns a non-empty points array with default limit", async () => {
        const res = await api.get(`/store/apiship/points?limit=5&shipping_option_id=${shippingOptionId}`, { headers: storeHeaders })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.points)).toBe(true)
        expect(res.data.points.length).toBeGreaterThan(0)
        expect(res.data.points.length).toBeLessThanOrEqual(5)
      })

      it("each point has id and providerKey fields", async () => {
        const res = await api.get(`/store/apiship/points?limit=3&shipping_option_id=${shippingOptionId}`, { headers: storeHeaders })

        for (const point of res.data.points) {
          expect(point.id).toBeDefined()
          expect(typeof point.providerKey).toBe("string")
        }
      })

      it("filter by providerKey returns only that provider's points", async () => {
        const res = await api.get(
          `/store/apiship/points?filter=providerKey%3Dcdek&limit=10&shipping_option_id=${shippingOptionId}`,
          { headers: storeHeaders }
        )

        expect(res.status).toBe(200)
        expect(res.data.points.length).toBeGreaterThan(0)
        for (const point of res.data.points) {
          expect(point.providerKey).toBe("cdek")
        }
      })
    })

    // -------------------------------------------------------------------------
    // Instance addressing — the storefront can only target the instance that backs the
    // shipping option it passes; it cannot name an arbitrary `provider_id`.
    // -------------------------------------------------------------------------
    describe("instance addressing", () => {
      it("returns 404 when the shipping option doesn't exist", async () => {
        const res = await api
          .get(
            "/store/apiship/providers?shipping_option_id=so_does_not_exist",
            { headers: storeHeaders }
          )
          .catch((err: any) => err.response)

        expect(res.status).toBe(404)
      })

      it("honours an explicit provider_id — needed before a shipping option exists", async () => {
        const res = await api.get(
          `/store/apiship/providers?provider_id=${PROVIDER_ID}`,
          { headers: storeHeaders }
        )

        expect(res.status).toBe(200)
        expect(res.data.providers.map((p: any) => p.key)).toContain("cdek")
      })

      it("404s when neither parameter is given and no default instance is declared", async () => {
        const res = await api
          .get("/store/apiship/providers", { headers: storeHeaders })
          .catch((err: any) => err.response)

        expect(res.status).toBe(404)
      })

      it("404s for a provider_id that is not an ApiShip registration", async () => {
        const res = await api
          .get("/store/apiship/providers?provider_id=int_tkassa", { headers: storeHeaders })
          .catch((err: any) => err.response)

        expect(res.status).toBe(404)
      })
    })

    // -------------------------------------------------------------------------
    // Resolve gating — store reads go through the integration module's resolver, so a
    // disabled integration is invisible to shoppers (admin reads stay ungated).
    // -------------------------------------------------------------------------
    describe("resolve gating", () => {
      it("does not serve providers while the integration is disabled", async () => {
        // Disabled before the first store read, so this asserts the gate itself rather than
        // the cache-invalidation event that a mid-flight toggle would depend on.
        await api.post(
          `/admin/integrations/${PROVIDER_ID}/enable`,
          { is_enabled: false },
          { headers: adminHeaders }
        )

        const res = await api
          .get(
            `/store/apiship/providers?shipping_option_id=${shippingOptionId}`,
            { headers: storeHeaders }
          )
          .catch((err: any) => err.response)

        expect(res.status).toBeGreaterThanOrEqual(400)
      })

      it("still serves the admin route while the integration is disabled", async () => {
        await api.post(
          `/admin/integrations/${PROVIDER_ID}/enable`,
          { is_enabled: false },
          { headers: adminHeaders }
        )

        const res = await api.get(
          `/admin/apiship/options?provider_id=${PROVIDER_ID}`,
          { headers: adminHeaders }
        )

        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.apiship_options.connections)).toBe(true)
      })
    })
  },
})
