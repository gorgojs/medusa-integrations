import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminHeaders } from "../utils/admin"

jest.setTimeout(120 * 1000)

const A = "int_test_a"
const B = "int_test_b"
const SECTION = "creds"
const VALID = { apiKey: "pub", secretKey: "shh", mode: "test" }

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let headers: { headers: { authorization: string } }
    let svc: any

    beforeAll(async () => {
      svc = getContainer().resolve("integration")
      headers = await createAdminHeaders(api, getContainer())
    })

    // Routes go through workflows that write real rows — reset between tests.
    beforeEach(async () => {
      const rows = await svc.listIntegrations({}, { take: 1000 })
      if (rows.length) await svc.deleteIntegrations(rows.map((r: any) => r.id))
      svc.clearOptionsCache()
    })

    const save = (providerId: string, body: any) =>
      api.post(`/admin/integrations/${providerId}`, body, headers).catch((e: any) => e.response)
    const get = (providerId: string) =>
      api.get(`/admin/integrations/${providerId}`, headers).catch((e: any) => e.response)

    describe("auth", () => {
      it("rejects an unauthenticated request with 401", async () => {
        const res = await api.get("/admin/integrations").catch((e: any) => e.response)
        expect(res.status).toBe(401)
      })
    })

    describe("GET /admin/integrations", () => {
      it("lists every registered instance as unconfigured", async () => {
        const res = await api.get("/admin/integrations", headers)
        expect(res.status).toBe(200)
        const byId = Object.fromEntries(res.data.integrations.map((i: any) => [i.provider_id, i]))
        expect(byId[A]).toMatchObject({ is_configured: false, has_test_connection: true })
        expect(byId[B]).toBeDefined()
      })
    })

    describe("GET /admin/integrations — filtering + pagination", () => {
      it("returns count, the categories facet, and docs_url", async () => {
        const res = await api.get("/admin/integrations", headers)
        expect(res.status).toBe(200)
        expect(typeof res.data.count).toBe("number")
        expect(res.data.categories).toContain("payment")
        expect(typeof res.data.docs_url).toBe("string")
      })

      it("filters by category (empty for a category with no providers)", async () => {
        const res = await api.get("/admin/integrations?category=fulfillment", headers)
        expect(res.status).toBe(200)
        expect(res.data.integrations).toHaveLength(0)
        expect(res.data.count).toBe(0)
        // facet still lists the real categories, so the tab bar stays stable
        expect(res.data.categories).toContain("payment")
      })

      it("filters by q on the identifier", async () => {
        const res = await api.get("/admin/integrations?q=test", headers)
        expect(res.status).toBe(200)
        expect(res.data.integrations.length).toBeGreaterThan(0)
        expect(res.data.integrations.every((i: any) => i.identifier.includes("test"))).toBe(true)
      })

      it("paginates via limit/offset while count reflects the full set", async () => {
        const res = await api.get("/admin/integrations?limit=1&offset=0", headers)
        expect(res.status).toBe(200)
        expect(res.data.integrations).toHaveLength(1)
        expect(res.data.count).toBeGreaterThanOrEqual(2)
        expect(res.data.limit).toBe(1)
        expect(res.data.offset).toBe(0)
      })

      it("400s on an invalid limit", async () => {
        const res = await api.get("/admin/integrations?limit=0", headers).catch((e: any) => e.response)
        expect(res.status).toBe(400)
      })
    })

    describe("GET /admin/integrations/:provider_id", () => {
      it("404s for an unregistered provider", async () => {
        const res = await get("int_nope")
        expect(res.status).toBe(404)
      })

      it("returns the descriptor with a null record when unconfigured", async () => {
        const res = await get(A)
        expect(res.status).toBe(200)
        expect(res.data.descriptor?.identifier).toBe("test")
        expect(res.data.integration).toBeNull()
        expect(res.data.is_complete).toBe(false)
      })

      it("includes package meta fields (version/author/author_url)", async () => {
        const res = await get(A)
        expect(res.status).toBe(200)
        expect(res.data).toHaveProperty("version")
        expect(res.data).toHaveProperty("author")
        expect(res.data).toHaveProperty("author_url")
      })
    })

    describe("POST /admin/integrations/:provider_id (section save → upsert workflow)", () => {
      it("404s for an unregistered provider", async () => {
        const res = await save("int_nope", { section_id: SECTION, values: VALID })
        expect(res.status).toBe(404)
      })

      it("400s for an unknown section", async () => {
        const res = await save(A, { section_id: "nope", values: {} })
        expect(res.status).toBe(400)
      })

      it("400s for an invalid value with a field-prefixed message", async () => {
        const res = await save(A, { section_id: SECTION, values: { apiKey: "", secretKey: "shh" } })
        expect(res.status).toBe(400)
        expect(String(res.data.message)).toMatch(/apiKey/)
      })

      it("persists a valid section and never echoes the secret back", async () => {
        const res = await save(A, { section_id: SECTION, values: VALID })
        expect(res.status).toBe(200)
        const m = res.data.integration
        expect(m.values.apiKey).toBe("pub")
        expect(m.values.mode).toBe("test")
        expect(Object.prototype.hasOwnProperty.call(m.values, "secretKey")).toBe(false)
        expect(m.configured_secrets).toContain("secretKey")

        // …and it becomes complete + resolvable
        const detail = await get(A)
        expect(detail.data.is_complete).toBe(true)
        expect(await svc.getResolvedOptions("test", "a")).not.toBeNull()
      })
    })

    describe("POST /admin/integrations/:provider_id/enable", () => {
      it("404s when the integration is not configured yet", async () => {
        const res = await api
          .post(`/admin/integrations/${B}/enable`, { is_enabled: false }, headers)
          .catch((e: any) => e.response)
        expect(res.status).toBe(404)
      })

      it("toggles is_enabled on a configured integration", async () => {
        await save(A, { section_id: SECTION, values: VALID })
        const off = await api.post(`/admin/integrations/${A}/enable`, { is_enabled: false }, headers)
        expect(off.status).toBe(200)
        expect(off.data.integration.is_enabled).toBe(false)
        const on = await api.post(`/admin/integrations/${A}/enable`, { is_enabled: true }, headers)
        expect(on.data.integration.is_enabled).toBe(true)
      })
    })

    describe("POST /admin/integrations/:provider_id/test-connection", () => {
      it("returns 'Not configured' when unconfigured", async () => {
        const res = await api.post(`/admin/integrations/${A}/test-connection`, {}, headers)
        expect(res.status).toBe(200)
        expect(res.data).toEqual({ status: "failed", message: "Not configured" })
      })

      it("passes once configured and persists last_test_status", async () => {
        await save(A, { section_id: SECTION, values: VALID })
        const res = await api.post(`/admin/integrations/${A}/test-connection`, {}, headers)
        expect(res.data.status).toBe("passed")

        const detail = await get(A)
        expect(detail.data.integration.last_test_status).toBe("passed")
      })
    })

    describe("DELETE /admin/integrations/:provider_id", () => {
      it("removes a configured integration", async () => {
        await save(A, { section_id: SECTION, values: VALID })
        const del = await api.delete(`/admin/integrations/${A}`, headers)
        expect(del.status).toBe(200)
        expect(del.data).toMatchObject({ id: A, object: "integration", deleted: true })

        const detail = await get(A)
        expect(detail.data.integration).toBeNull()
      })
    })

    describe("GET /admin/integrations/catalog", () => {
      it("returns the catalog with install flags (and is not shadowed by :provider_id)", async () => {
        const res = await api.get("/admin/integrations/catalog", headers)
        expect(res.status).toBe(200) // 404 here would mean [provider_id] shadowed the static route
        expect(res.data.integrations.length).toBeGreaterThanOrEqual(5)
        const tkassa = res.data.integrations.find((c: any) => c.integrationId === "tkassa")
        expect(tkassa).toBeDefined()
        expect(typeof tkassa.installed).toBe("boolean")
        expect(tkassa).toHaveProperty("provider_id")
      })
    })
  },
})
