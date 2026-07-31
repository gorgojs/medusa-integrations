/**
 * Integration tests for admin API endpoints that proxy ApiShip calls.
 *
 * External ApiShip HTTP calls are intercepted by nock so tests are always-on
 * and deterministic — no CI_APISHIP_TOKEN required.
 *
 * The full stack is exercised: route → workflow → createApishipClient → nock.
 *
 * Endpoints covered:
 *   GET /admin/apiship/providers           → getApishipProvidersWorkflow
 *   GET /admin/apiship/points              → getApishipPointsWorkflow
 *   GET /admin/apiship/account-connections → getApishipAccountConnectionsWorkflow
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
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
  { key: "dhl", name: "DHL" },
]

const MOCK_POINTS = [
  { id: 1, providerKey: "cdek", address: "Москва, ул. Ленина 1" },
  { id: 2, providerKey: "cdek", address: "Москва, ул. Мира 5" },
  { id: 3, providerKey: "boxberry", address: "СПб, Невский 10" },
]

const MOCK_CONNECTIONS = [
  { id: 1, providerKey: "cdek", name: "CDEK договор" },
  { id: 2, providerKey: "boxberry", name: "Boxberry договор" },
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

  nock(APISHIP_HOST)
    .persist()
    .get("/v1/connections")
    .reply(200, { rows: MOCK_CONNECTIONS })
})

afterAll(() => {
  nock.cleanAll()
  nock.restore()
})

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
// Credentials are descriptor-owned (integration module); settings are plugin-owned.
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
    })

    // -------------------------------------------------------------------------
    // GET /admin/apiship/providers
    // -------------------------------------------------------------------------
    describe("GET /admin/apiship/providers", () => {
      it("returns 200 with a non-empty providers array", async () => {
        const res = await api.get(`/admin/apiship/providers?provider_id=${PROVIDER_ID}`, { headers: adminHeaders })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.providers)).toBe(true)
        expect(res.data.providers.length).toBeGreaterThan(0)
      })

      it("each provider has key and name fields", async () => {
        const res = await api.get(`/admin/apiship/providers?provider_id=${PROVIDER_ID}`, { headers: adminHeaders })

        for (const provider of res.data.providers) {
          expect(typeof provider.key).toBe("string")
          expect(typeof provider.name).toBe("string")
        }
      })

      it("well-known providers are present (cdek, boxberry)", async () => {
        const res = await api.get(`/admin/apiship/providers?provider_id=${PROVIDER_ID}`, { headers: adminHeaders })
        const keys = res.data.providers.map((p: any) => p.key)

        expect(keys).toContain("cdek")
        expect(keys).toContain("boxberry")
      })

      it("returns 401 without authorization header", async () => {
        const res = await api
          .get(`/admin/apiship/providers?provider_id=${PROVIDER_ID}`)
          .catch((err: any) => err.response)

        expect(res.status).toBe(401)
      })
    })

    // -------------------------------------------------------------------------
    // GET /admin/apiship/points
    // -------------------------------------------------------------------------
    describe("GET /admin/apiship/points", () => {
      it("returns 200 with a points array", async () => {
        const res = await api.get(`/admin/apiship/points?limit=5&provider_id=${PROVIDER_ID}`, { headers: adminHeaders })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.points)).toBe(true)
        expect(res.data.points.length).toBeGreaterThan(0)
        expect(res.data.points.length).toBeLessThanOrEqual(5)
      })

      it("each point has id and providerKey fields", async () => {
        const res = await api.get(`/admin/apiship/points?limit=3&provider_id=${PROVIDER_ID}`, { headers: adminHeaders })

        for (const point of res.data.points) {
          expect(point.id).toBeDefined()
          expect(typeof point.providerKey).toBe("string")
        }
      })

      it("filter by providerKey returns only that provider's points", async () => {
        const res = await api.get(
          `/admin/apiship/points?filter=providerKey%3Dcdek&limit=10&provider_id=${PROVIDER_ID}`,
          { headers: adminHeaders }
        )

        expect(res.status).toBe(200)
        expect(res.data.points.length).toBeGreaterThan(0)
        for (const point of res.data.points) {
          expect(point.providerKey).toBe("cdek")
        }
      })

      it("returns 401 without authorization header", async () => {
        const res = await api
          .get(`/admin/apiship/points?provider_id=${PROVIDER_ID}`)
          .catch((err: any) => err.response)

        expect(res.status).toBe(401)
      })
    })

    // -------------------------------------------------------------------------
    // GET /admin/apiship/account-connections
    // -------------------------------------------------------------------------
    describe("GET /admin/apiship/account-connections", () => {
      it("returns 200 with an account_connections array", async () => {
        const res = await api.get(`/admin/apiship/account-connections?provider_id=${PROVIDER_ID}`, { headers: adminHeaders })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.account_connections)).toBe(true)
      })

      it("each connection has id and provider_key fields (DTO mapping check)", async () => {
        const res = await api.get(`/admin/apiship/account-connections?provider_id=${PROVIDER_ID}`, { headers: adminHeaders })

        for (const connection of res.data.account_connections) {
          expect(connection.id).toBeDefined()
          expect(typeof connection.provider_key).toBe("string")
        }
      })

      it("returns 401 without authorization header", async () => {
        const res = await api
          .get(`/admin/apiship/account-connections?provider_id=${PROVIDER_ID}`)
          .catch((err: any) => err.response)

        expect(res.status).toBe(401)
      })
    })
  },
})
