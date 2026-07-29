/**
 * Integration tests for admin API: /admin/apiship/connections
 *
 * Tests full CRUD for provider connection management:
 *   GET    /admin/apiship/connections
 *   POST   /admin/apiship/connections
 *   GET    /admin/apiship/connections/:id
 *   POST   /admin/apiship/connections/:id   (update)
 *   DELETE /admin/apiship/connections/:id
 *
 * No live ApiShip API token needed — connections are stored inline in the
 * encrypted apiship config row managed by @gorgo/medusa-integration's
 * IntegrationModuleService.
 *
 * State management:
 *   medusaIntegrationTestRunner wipes the DB after every it() block.
 *   Each test is fully self-contained.
 *
 * BASE_OPTIONS is posted at the start of tests to establish a configured
 * apiship integration row before creating/reading connections against it.
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import jwt from "jsonwebtoken"

jest.setTimeout(120 * 1000)

// Matches the named instance declared in medusa-config.ts (APISHIP_INTEGRATION_ID).
const PROVIDER_ID = "int_apiship_apiship-1"

const BASE_OPTIONS = {
  token: "test-token-123",
  is_test: true,
  settings: {
    is_cod: false,
    default_product_sizes: { length: 10, width: 10, height: 10, weight: 20 },
  },
}

const CONN_CDEK = {
  provider_key: "cdek",
  provider_connect_id: "12345",
  is_enabled: true,
  name: "СДЭК тест",
}

const CONN_BOXBERRY = {
  provider_key: "boxberry",
  provider_connect_id: "67890",
  is_enabled: false,
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    const headers: Record<string, string> = {}

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

      const token = jwt.sign(
        {
          actor_id: user.id,
          actor_type: "user",
          auth_identity_id: authIdentity.id,
        },
        "supersecret",
        { expiresIn: "1d" }
      )
      headers["authorization"] = `Bearer ${token}`
    })

    // -------------------------------------------------------------------------
    // GET /admin/apiship/connections
    // -------------------------------------------------------------------------
    describe("GET /admin/apiship/connections", () => {
      it("returns an empty array when no connections exist", async () => {
        const res = await api.get(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, { headers })

        expect(res.status).toBe(200)
        expect(Array.isArray(res.data.connections)).toBe(true)
        expect(res.data.connections).toHaveLength(0)
      })

      it("returns all created connections", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })
        await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_CDEK, { headers })
        await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_BOXBERRY, { headers })

        const res = await api.get(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, { headers })

        expect(res.status).toBe(200)
        expect(res.data.connections).toHaveLength(2)
        const keys = res.data.connections.map((c: any) => c.provider_key)
        expect(keys).toContain("cdek")
        expect(keys).toContain("boxberry")
      })

      it("requires authentication — 401 without token", async () => {
        const res = await api
          .get(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`)
          .catch((e: any) => e.response)

        expect(res.status).toBe(401)
      })
    })

    // -------------------------------------------------------------------------
    // POST /admin/apiship/connections
    // -------------------------------------------------------------------------
    describe("POST /admin/apiship/connections", () => {
      it("creates a connection and returns it with a generated id", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })

        const res = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_CDEK, { headers })

        expect(res.status).toBe(200)
        const conn = res.data.connection
        expect(conn.id).toMatch(/^ascon_/)
        expect(conn.provider_key).toBe("cdek")
        expect(conn.provider_connect_id).toBe("12345")
        expect(conn.is_enabled).toBe(true)
        expect(conn.name).toBe("СДЭК тест")
      })

      it("creates a connection without optional name field", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })

        const res = await api.post(
          `/admin/apiship/connections?provider_id=${PROVIDER_ID}`,
          { provider_key: "boxberry", provider_connect_id: "999", is_enabled: false },
          { headers }
        )

        expect(res.status).toBe(200)
        expect(res.data.connection.provider_key).toBe("boxberry")
      })

      it("each new connection gets a unique id", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })

        const res1 = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_CDEK, { headers })
        const res2 = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_BOXBERRY, { headers })

        expect(res1.data.connection.id).not.toBe(res2.data.connection.id)
        expect(res1.data.connection.id).toMatch(/^ascon_/)
        expect(res2.data.connection.id).toMatch(/^ascon_/)
      })

      it("returns 400 when provider_key is missing", async () => {
        const res = await api
          .post(
            `/admin/apiship/connections?provider_id=${PROVIDER_ID}`,
            { provider_connect_id: "123", is_enabled: true },
            { headers }
          )
          .catch((e: any) => e.response)

        expect(res.status).toBe(400)
      })

      it("returns 400 when provider_connect_id is missing", async () => {
        const res = await api
          .post(
            `/admin/apiship/connections?provider_id=${PROVIDER_ID}`,
            { provider_key: "cdek", is_enabled: true },
            { headers }
          )
          .catch((e: any) => e.response)

        expect(res.status).toBe(400)
      })

      it("returns 400 when is_enabled is missing", async () => {
        const res = await api
          .post(
            `/admin/apiship/connections?provider_id=${PROVIDER_ID}`,
            { provider_key: "cdek", provider_connect_id: "123" },
            { headers }
          )
          .catch((e: any) => e.response)

        expect(res.status).toBe(400)
      })

      it("requires authentication — 401 without token", async () => {
        const res = await api
          .post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_CDEK)
          .catch((e: any) => e.response)

        expect(res.status).toBe(401)
      })
    })

    // -------------------------------------------------------------------------
    // GET /admin/apiship/connections/:id
    // -------------------------------------------------------------------------
    describe("GET /admin/apiship/connections/:id", () => {
      it("returns the connection by id", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })
        const createRes = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_CDEK, { headers })
        const id = createRes.data.connection.id

        const res = await api.get(`/admin/apiship/connections/${id}?provider_id=${PROVIDER_ID}`, { headers })

        expect(res.status).toBe(200)
        expect(res.data.connection.id).toBe(id)
        expect(res.data.connection.provider_key).toBe("cdek")
        expect(res.data.connection.provider_connect_id).toBe("12345")
        expect(res.data.connection.is_enabled).toBe(true)
        expect(res.data.connection.name).toBe("СДЭК тест")
      })

      it("returns 404 for an unknown id", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })

        const res = await api
          .get(`/admin/apiship/connections/ascon_does_not_exist?provider_id=${PROVIDER_ID}`, { headers })
          .catch((e: any) => e.response)

        expect(res.status).toBe(404)
      })

      it("requires authentication — 401 without token", async () => {
        const res = await api
          .get(`/admin/apiship/connections/ascon_any?provider_id=${PROVIDER_ID}`)
          .catch((e: any) => e.response)

        expect(res.status).toBe(401)
      })
    })

    // -------------------------------------------------------------------------
    // POST /admin/apiship/connections/:id  (update)
    // -------------------------------------------------------------------------
    describe("POST /admin/apiship/connections/:id", () => {
      it("updates specified fields and returns the merged connection", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })
        const createRes = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_CDEK, { headers })
        const id = createRes.data.connection.id

        const res = await api.post(
          `/admin/apiship/connections/${id}?provider_id=${PROVIDER_ID}`,
          { name: "СДЭК обновлённый", is_enabled: false, provider_connect_id: "99999" },
          { headers }
        )

        expect(res.status).toBe(200)
        const conn = res.data.connection
        expect(conn.id).toBe(id)
        expect(conn.name).toBe("СДЭК обновлённый")
        expect(conn.is_enabled).toBe(false)
        expect(conn.provider_connect_id).toBe("99999")
        // Fields not in the update are preserved
        expect(conn.provider_key).toBe("cdek")
      })

      it("persists update — GET /:id returns updated values", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })
        const createRes = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_CDEK, { headers })
        const id = createRes.data.connection.id

        await api.post(
          `/admin/apiship/connections/${id}?provider_id=${PROVIDER_ID}`,
          { name: "Новое имя" },
          { headers }
        )

        const getRes = await api.get(`/admin/apiship/connections/${id}?provider_id=${PROVIDER_ID}`, { headers })
        expect(getRes.data.connection.name).toBe("Новое имя")
      })

      it("does not affect other connections", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })
        const res1 = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_CDEK, { headers })
        const res2 = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_BOXBERRY, { headers })
        const idA = res1.data.connection.id
        const idB = res2.data.connection.id

        await api.post(
          `/admin/apiship/connections/${idA}?provider_id=${PROVIDER_ID}`,
          { name: "СДЭК renamed" },
          { headers }
        )

        const listRes = await api.get(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, { headers })
        const connB = listRes.data.connections.find((c: any) => c.id === idB)
        expect(connB.provider_key).toBe("boxberry")
        expect(connB.provider_connect_id).toBe("67890")
      })

      it("returns 404 for an unknown id", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })

        const res = await api
          .post(
            `/admin/apiship/connections/ascon_does_not_exist?provider_id=${PROVIDER_ID}`,
            { name: "ghost" },
            { headers }
          )
          .catch((e: any) => e.response)

        expect(res.status).toBe(404)
      })

      it("requires authentication — 401 without token", async () => {
        const res = await api
          .post(`/admin/apiship/connections/ascon_any?provider_id=${PROVIDER_ID}`, { name: "x" })
          .catch((e: any) => e.response)

        expect(res.status).toBe(401)
      })
    })

    // -------------------------------------------------------------------------
    // DELETE /admin/apiship/connections/:id
    // -------------------------------------------------------------------------
    describe("DELETE /admin/apiship/connections/:id", () => {
      it("deletes the connection and returns the delete response", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })
        const createRes = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_CDEK, { headers })
        const id = createRes.data.connection.id

        const res = await api.delete(`/admin/apiship/connections/${id}?provider_id=${PROVIDER_ID}`, { headers })

        expect(res.status).toBe(200)
        expect(res.data.id).toBe(id)
        expect(res.data.object).toBe("connection")
        expect(res.data.deleted).toBe(true)
      })

      it("removed connection no longer appears in GET list", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })
        const res1 = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_CDEK, { headers })
        const res2 = await api.post(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, CONN_BOXBERRY, { headers })
        const idA = res1.data.connection.id
        const idB = res2.data.connection.id

        await api.delete(`/admin/apiship/connections/${idA}?provider_id=${PROVIDER_ID}`, { headers })

        const listRes = await api.get(`/admin/apiship/connections?provider_id=${PROVIDER_ID}`, { headers })
        const ids = listRes.data.connections.map((c: any) => c.id)
        expect(ids).not.toContain(idA)
        expect(ids).toContain(idB)
      })

      it("returns 404 for an unknown id", async () => {
        await api.post(`/admin/apiship/options?provider_id=${PROVIDER_ID}`, BASE_OPTIONS, { headers })

        const res = await api
          .delete(`/admin/apiship/connections/ascon_does_not_exist?provider_id=${PROVIDER_ID}`, { headers })
          .catch((e: any) => e.response)

        expect(res.status).toBe(404)
      })

      it("requires authentication — 401 without token", async () => {
        const res = await api
          .delete(`/admin/apiship/connections/ascon_any?provider_id=${PROVIDER_ID}`)
          .catch((e: any) => e.response)

        expect(res.status).toBe(401)
      })
    })
  },
})
