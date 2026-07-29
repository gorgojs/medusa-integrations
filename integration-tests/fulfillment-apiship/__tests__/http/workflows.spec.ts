/**
 * Integration tests for ApiShip workflows.
 *
 * Rules for state management:
 * - getContainer() is called ONLY inside test bodies, never in beforeAll/beforeEach
 *   (the container's store-module scope may not be fully ready outside test bodies).
 * - medusaIntegrationTestRunner wipes the database after EVERY it() block via
 *   afterEach → dbUtils.teardown. Each test therefore MUST be fully self-contained:
 *   bootstrap BASE_OPTIONS and any required connections at the start of that test.
 *   Sharing mutable state via `let` variables across it() blocks does not work.
 * - BASE_OPTIONS establishes a fully-configured apiship integration row (via
 *   updateApishipOptionsWorkflow) before exercising the other workflows.
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import nock from "nock"
import {
  getApishipOptionsWorkflow,
  saveCalculationWorkflow,
  getCalculationWorkflow,
} from "@gorgo/medusa-fulfillment-apiship/workflows"

// Workflows not re-exported from the barrel — import via subpath.
// The package.json "./*" wildcard export maps these to the built output.
const { updateApishipOptionsWorkflow } = require(
  "@gorgo/medusa-fulfillment-apiship/workflows/update-apiship-options"
)
const { createApishipConnectionsWorkflow } = require(
  "@gorgo/medusa-fulfillment-apiship/workflows/create-apiship-connections"
)
const { getApishipConnectionsWorkflow } = require(
  "@gorgo/medusa-fulfillment-apiship/workflows/get-apiship-connections"
)
const { deleteApishipConnectionsWorkflow } = require(
  "@gorgo/medusa-fulfillment-apiship/workflows/delete-apiship-connections"
)
const { updateApishipConnectionWorkflow } = require(
  "@gorgo/medusa-fulfillment-apiship/workflows/update-apiship-connection"
)
const { getApishipProvidersWorkflow } = require(
  "@gorgo/medusa-fulfillment-apiship/workflows/get-apiship-providers"
)
const { getApishipAccountConnectionsWorkflow } = require(
  "@gorgo/medusa-fulfillment-apiship/workflows/get-apiship-account-connections"
)
const { getApishipPointsWorkflow } = require(
  "@gorgo/medusa-fulfillment-apiship/workflows/get-apiship-points"
)

// ---------------------------------------------------------------------------
// nock — intercepts external ApiShip HTTP calls for workflow tests
// Base URL for test mode: http://api.dev.apiship.ru/v1
// ---------------------------------------------------------------------------
const APISHIP_HOST = "http://api.dev.apiship.ru"

const MOCK_PROVIDERS = [
  { key: "cdek", name: "CDEK" },
  { key: "boxberry", name: "Boxberry" },
  { key: "dhl", name: "DHL" },
]

const MOCK_CONNECTIONS = [
  { id: 1, providerKey: "cdek", name: "CDEK договор" },
  { id: 2, providerKey: "boxberry", name: "Boxberry договор" },
]

const MOCK_POINTS = [
  { id: 1, providerKey: "cdek" },
  { id: 2, providerKey: "cdek" },
  { id: 3, providerKey: "boxberry" },
]

beforeAll(() => {
  nock(APISHIP_HOST)
    .persist()
    .get("/v1/lists/providers")
    .reply(200, { rows: MOCK_PROVIDERS })

  nock(APISHIP_HOST)
    .persist()
    .get("/v1/connections")
    .reply(200, { rows: MOCK_CONNECTIONS })

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

jest.setTimeout(120 * 1000)

/**
 * Complete options object used to establish a fully-configured apiship
 * integration row at the start of each test.
 */
const PROVIDER_ID = "int_apiship_apiship-1"

const BASE_OPTIONS = {
  provider_id: PROVIDER_ID,
  token: "test-token-123",
  is_test: true as const,
  settings: {
    is_cod: false as const,
    default_product_sizes: { length: 10, width: 10, height: 10, weight: 20 },
  },
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ getContainer }) => {
    // -------------------------------------------------------------------------
    // getApishipOptionsWorkflow
    // -------------------------------------------------------------------------
    describe("getApishipOptionsWorkflow", () => {
      it("returns default options when apiship is not configured yet", async () => {
        const container = getContainer()
        const { result } = await getApishipOptionsWorkflow(container).run()

        expect(result.token).toBe("")
        expect(result.is_test).toBe(false)
        expect(result.settings.default_product_sizes.length).toBe(10)
        expect(result.settings.default_product_sizes.weight).toBe(20)
        expect(result.settings.is_cod).toBe(false)
        expect(result.settings.delivery_cost_vat).toBe(-1)
        expect(result.settings.connections).toEqual([])
      })
    })

    // -------------------------------------------------------------------------
    // updateApishipOptionsWorkflow
    // Each test seeds its own complete initial state (BASE_OPTIONS).
    // -------------------------------------------------------------------------
    describe("updateApishipOptionsWorkflow", () => {
      it("persists token and is_test", async () => {
        const container = getContainer()

        await updateApishipOptionsWorkflow(container).run({
          input: BASE_OPTIONS,
        })

        const { result } = await getApishipOptionsWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })
        expect(result.token).toBe("test-token-123")
        expect(result.is_test).toBe(true)
      })

      it("deep-merges partial updates — existing fields are preserved", async () => {
        const container = getContainer()

        // Establish full state first
        await updateApishipOptionsWorkflow(container).run({
          input: BASE_OPTIONS,
        })

        // Partial update — only sender settings
        await updateApishipOptionsWorkflow(container).run({
          input: {
            provider_id: PROVIDER_ID,
            settings: {
              default_sender_settings: {
                country_code: "RU",
                address_string: "Москва, Тверская, 1",
                contact_name: "Test User",
                phone: "+70000000000",
              },
            },
          },
        })

        const { result } = await getApishipOptionsWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })
        expect(result.token).toBe("test-token-123")
        expect(result.is_test).toBe(true)
        expect(result.settings.default_sender_settings.country_code).toBe("RU")
        expect(result.settings.default_sender_settings.contact_name).toBe("Test User")
      })

      it("updates product sizes without touching other settings", async () => {
        const container = getContainer()

        // Full state with sender settings already included
        await updateApishipOptionsWorkflow(container).run({
          input: {
            ...BASE_OPTIONS,
            settings: {
              ...BASE_OPTIONS.settings,
              default_sender_settings: {
                country_code: "RU",
                address_string: "Москва, Тверская, 1",
                contact_name: "Test User",
                phone: "+70000000000",
              },
            },
          },
        })

        await updateApishipOptionsWorkflow(container).run({
          input: {
            provider_id: PROVIDER_ID,
            settings: {
              default_product_sizes: { length: 30, width: 20, height: 15, weight: 500 },
            },
          },
        })

        const { result } = await getApishipOptionsWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })
        expect(result.settings.default_product_sizes.length).toBe(30)
        expect(result.settings.default_product_sizes.weight).toBe(500)
        expect(result.settings.default_sender_settings.country_code).toBe("RU")
      })
    })

    // -------------------------------------------------------------------------
    // connections CRUD
    //
    // IMPORTANT: medusaIntegrationTestRunner wipes the database after every
    // single it() block (afterEach → dbUtils.teardown). Each test therefore
    // starts with a completely fresh store and MUST bootstrap its own state
    // independently — sharing state via `let` variables across tests does NOT
    // work here.
    // -------------------------------------------------------------------------
    describe("connections CRUD", () => {
      it("createApishipConnectionsWorkflow creates a connection with a generated id", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result } = await createApishipConnectionsWorkflow(container).run({
          input: {
            provider_id: PROVIDER_ID,
            connections: [
              {
                provider_key: "cdek",
                provider_connect_id: "12345",
                is_enabled: true,
                name: "СДЭК тест",
              },
            ],
          },
        })

        expect(result).toHaveLength(1)
        expect(result[0].id).toMatch(/^ascon_/)
        expect(result[0].provider_key).toBe("cdek")
        expect(result[0].provider_connect_id).toBe("12345")
        expect(result[0].is_enabled).toBe(true)
        expect(result[0].name).toBe("СДЭК тест")
      })

      it("createApishipConnectionsWorkflow appends a second connection — total grows to 2", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result: [connA] } = await createApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, connections: [{ provider_key: "cdek", provider_connect_id: "12345", is_enabled: true, name: "СДЭК тест" }] },
        })

        const { result: [connB] } = await createApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, connections: [{ provider_key: "boxberry", provider_connect_id: "67890", is_enabled: false }] },
        })

        expect(connB.provider_key).toBe("boxberry")
        expect(connB.id).toMatch(/^ascon_/)
        expect(connB.id).not.toBe(connA.id)

        const { result: all } = await getApishipConnectionsWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })
        expect(all.length).toBe(2)
        expect(all.some((c: any) => c.provider_key === "cdek")).toBe(true)
        expect(all.some((c: any) => c.provider_key === "boxberry")).toBe(true)
      })

      it("getApishipConnectionsWorkflow returns all connections", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result: [connA] } = await createApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, connections: [{ provider_key: "cdek", provider_connect_id: "12345", is_enabled: true, name: "СДЭК тест" }] },
        })
        const { result: [connB] } = await createApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, connections: [{ provider_key: "boxberry", provider_connect_id: "67890", is_enabled: false }] },
        })

        const { result } = await getApishipConnectionsWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })

        const ids = result.map((c: any) => c.id)
        expect(ids).toContain(connA.id)
        expect(ids).toContain(connB.id)
        expect(result.length).toBeGreaterThanOrEqual(2)
      })

      it("getApishipConnectionsWorkflow returns single connection when filtered by id", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result: [connA] } = await createApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, connections: [{ provider_key: "cdek", provider_connect_id: "12345", is_enabled: true }] },
        })

        const { result } = await getApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, id: connA.id },
        })

        expect(result).toHaveLength(1)
        expect(result[0].id).toBe(connA.id)
        expect(result[0].provider_key).toBe("cdek")
      })

      it("getApishipConnectionsWorkflow returns errors for an unknown id", async () => {
        const container = getContainer()
        // Bootstrap options — no connections added.
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { errors } = await getApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, id: "ascon_does_not_exist" },
          throwOnError: false,
        })

        expect(errors?.length ?? 0).toBeGreaterThan(0)
      })

      it("deleteApishipConnectionsWorkflow removes a connection and returns it", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result: [connA] } = await createApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, connections: [{ provider_key: "cdek", provider_connect_id: "12345", is_enabled: true }] },
        })
        const { result: [connB] } = await createApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, connections: [{ provider_key: "boxberry", provider_connect_id: "67890", is_enabled: false }] },
        })

        const { result: deleted } = await deleteApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, ids: [connA.id] },
        })

        expect(deleted).toHaveLength(1)
        expect(deleted[0].id).toBe(connA.id)

        const { result: remaining } = await getApishipConnectionsWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })
        const remainingIds = remaining.map((c: any) => c.id)
        expect(remainingIds).not.toContain(connA.id)
        expect(remainingIds).toContain(connB.id)
      })

      it("deleteApishipConnectionsWorkflow returns errors for an unknown id", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { errors } = await deleteApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, ids: ["ascon_does_not_exist"] },
          throwOnError: false,
        })

        expect(errors?.length ?? 0).toBeGreaterThan(0)
      })
    })

    // -------------------------------------------------------------------------
    // updateApishipConnectionWorkflow
    // -------------------------------------------------------------------------
    describe("updateApishipConnectionWorkflow", () => {
      it("updates connection fields and returns the merged connection", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result: [conn] } = await createApishipConnectionsWorkflow(container).run({
          input: {
            provider_id: PROVIDER_ID,
            connections: [{
              provider_key: "cdek",
              provider_connect_id: "12345",
              is_enabled: true,
              name: "СДЭК тест",
            }],
          },
        })

        const { result: updated } = await updateApishipConnectionWorkflow(container).run({
          input: {
            provider_id: PROVIDER_ID,
            id: conn.id,
            update: { name: "СДЭК обновлённый", is_enabled: false, provider_connect_id: "99999" },
          },
        })

        expect(updated.id).toBe(conn.id)
        expect(updated.name).toBe("СДЭК обновлённый")
        expect(updated.is_enabled).toBe(false)
        expect(updated.provider_connect_id).toBe("99999")
        // Fields not in the update are preserved
        expect(updated.provider_key).toBe("cdek")
      })

      it("preserves other connections when one is updated", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result: [connA] } = await createApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, connections: [{ provider_key: "cdek", provider_connect_id: "111", is_enabled: true }] },
        })
        const { result: [connB] } = await createApishipConnectionsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, connections: [{ provider_key: "boxberry", provider_connect_id: "222", is_enabled: true }] },
        })

        await updateApishipConnectionWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, id: connA.id, update: { name: "СДЭК renamed" } },
        })

        const { result: all } = await getApishipConnectionsWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })
        expect(all).toHaveLength(2)
        const bConn = all.find((c: any) => c.id === connB.id)
        expect(bConn.provider_key).toBe("boxberry")
        expect(bConn.provider_connect_id).toBe("222")
      })

      it("returns errors for an unknown connection id", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { errors } = await updateApishipConnectionWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, id: "ascon_does_not_exist", update: { name: "ghost" } },
          throwOnError: false,
        })

        expect(errors?.length ?? 0).toBeGreaterThan(0)
      })
    })

    // -------------------------------------------------------------------------
    // saveCalculationWorkflow + getCalculationWorkflow (cache round-trip)
    // -------------------------------------------------------------------------
    describe("calculation cache (saveCalculationWorkflow + getCalculationWorkflow)", () => {
      const CACHE_KEY = "it_test_calc_key"

      it("stores data and retrieves it by key", async () => {
        const container = getContainer()
        const payload = { price: 49900, tariffId: 42, providerKey: "cdek" }

        await saveCalculationWorkflow(container).run({
          input: { key: CACHE_KEY, data: payload },
        })

        const { result } = await getCalculationWorkflow(container).run({
          input: { key: CACHE_KEY },
        })

        expect(result).toMatchObject(payload)
      })

      it("returns null/undefined for a key that was never saved", async () => {
        const container = getContainer()

        const { result } = await getCalculationWorkflow(container).run({
          input: { key: "it_test_missing_key" },
        })

        expect(result == null).toBe(true)
      })
    })

    // -------------------------------------------------------------------------
    // getApishipProvidersWorkflow
    //
    // Cache behaviour: the workflow stores results under "apiship:providers" in
    // the in-memory Medusa cache, which persists across it() blocks within a
    // single runner process. The cache-round-trip test exercises both branches
    // (miss → fetch → save, hit → return cached) in one isolated test body.
    // -------------------------------------------------------------------------
    describe("getApishipProvidersWorkflow", () => {
      it("returns a non-empty providers list with key and name", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result } = await getApishipProvidersWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
        for (const provider of result) {
          expect(typeof provider.key).toBe("string")
          expect(typeof provider.name).toBe("string")
        }
      })

      it("well-known providers are present (cdek, boxberry)", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result } = await getApishipProvidersWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })
        const keys = result.map((p: any) => p.key)

        expect(keys).toContain("cdek")
        expect(keys).toContain("boxberry")
      })

      it("cache round-trip: second call returns cached result", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result: first } = await getApishipProvidersWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })
        const { result: second } = await getApishipProvidersWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })

        expect(second).toEqual(first)
        expect(second.length).toBeGreaterThan(0)
      })
    })

    // -------------------------------------------------------------------------
    // getApishipAccountConnectionsWorkflow
    // Maps API rows: { id, providerKey, name } → { id, provider_key, name }
    // -------------------------------------------------------------------------
    describe("getApishipAccountConnectionsWorkflow", () => {
      it("returns an array of account connections", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result } = await getApishipAccountConnectionsWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })

        expect(Array.isArray(result)).toBe(true)
      })

      it("each connection has id and provider_key fields (DTO mapping check)", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result } = await getApishipAccountConnectionsWorkflow(container).run({ input: { provider_id: PROVIDER_ID } })

        for (const connection of result) {
          expect(connection.id).toBeDefined()
          // provider_key is mapped from API's providerKey (camelCase → snake_case)
          expect(typeof connection.provider_key).toBe("string")
        }
      })
    })

    // -------------------------------------------------------------------------
    // getApishipPointsWorkflow
    //
    // Two branches: no key → direct fetch, key set → cache-aware fetch.
    // Date.now() in the cache key prevents cross-test cache hits.
    // -------------------------------------------------------------------------
    describe("getApishipPointsWorkflow", () => {
      it("direct fetch (no key): returns a non-empty array of pickup points", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result } = await getApishipPointsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, limit: 5 },
        })

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
      })

      it("each point has id and providerKey fields (shape contract)", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result } = await getApishipPointsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, limit: 3 },
        })

        for (const point of result) {
          expect(point.id).toBeDefined()
          expect(typeof point.providerKey).toBe("string")
        }
      })

      it("filter by providerKey returns only that provider's points", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        const { result } = await getApishipPointsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, filter: "providerKey=cdek", limit: 10 },
        })

        expect(result.length).toBeGreaterThan(0)
        for (const point of result) {
          expect(point.providerKey).toBe("cdek")
        }
      })

      it("cache path: second call with same key returns cached result", async () => {
        const container = getContainer()
        await updateApishipOptionsWorkflow(container).run({ input: BASE_OPTIONS })

        // Unique key per run — avoids stale cache from other tests
        const cacheKey = `it_points_${Date.now()}`

        const { result: first } = await getApishipPointsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, key: cacheKey, limit: 5 },
        })

        expect(first.length).toBeGreaterThan(0)

        const { result: second } = await getApishipPointsWorkflow(container).run({
          input: { provider_id: PROVIDER_ID, key: cacheKey, limit: 5 },
        })

        expect(second).toEqual(first)
      })
    })
  },
})
