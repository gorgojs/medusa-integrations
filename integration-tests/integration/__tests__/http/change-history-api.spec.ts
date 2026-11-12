import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { createAdminHeaders } from "../utils/admin"

jest.setTimeout(120 * 1000)

const A = "int_test_a"
const B = "int_test_b"
const SECRET = "sk_history_api_secret_123"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let headers: { headers: Record<string, string> }
    let svc: any

    beforeAll(async () => {
      svc = getContainer().resolve("integration")
      headers = await createAdminHeaders(api, getContainer())
    })

    beforeEach(async () => {
      const rows = await svc.listIntegrations({}, { take: 1000 })
      if (rows.length) await svc.deleteIntegrations(rows.map((r: any) => r.id))
      svc.clearOptionsCache()
      const changes = await svc.listIntegrationChanges({}, { take: 1000, select: ["id"] })
      if (changes.length) await svc.deleteIntegrationChanges(changes.map((c: any) => c.id))
    })

    const call = (path: string, auth: any = headers) => api.get(path, auth).catch((e: any) => e.response)
    const save = (id: string, values: Record<string, unknown>) =>
      api.post(`/admin/integrations/${id}`, { section_id: "creds", values }, headers)

    // `recordChange` resolves with the new row's id.
    const record = async (provider_id: string, created_at: Date, extra: Record<string, unknown> = {}) => {
      const id: string = await svc.recordChange({
        provider_id,
        change_type: "updated",
        actor: { type: "user", id: "user_x", ip: "10.0.0.1", user_agent: "jest", request_id: "req_1" },
        actor_label: "x@it.test",
        created_at,
        diff: [],
        ...extra,
      })
      return { id }
    }

    const day = (n: number) => new Date(Date.UTC(2026, 0, n))

    describe("auth", () => {
      it("answers 401 without credentials on every route", async () => {
        for (const path of [
          "/admin/integrations/changes",
          "/admin/integrations/changes/intch_x",
          "/admin/integrations/changes/fields",
          "/admin/integrations/changes/actors",
          `/admin/integrations/${A}/changes`,
        ]) {
          expect((await call(path, {})).status).toBe(401)
        }
      })
    })

    describe("GET /admin/integrations/changes", () => {
      it("lists newest first with count, and pages by offset", async () => {
        await record(A, day(1))
        await record(A, day(3))
        await record(B, day(2))

        const res = await call("/admin/integrations/changes")
        expect(res.status).toBe(200)
        expect(res.data.count).toBe(3)
        expect(res.data.limit).toBe(20)
        expect(res.data.offset).toBe(0)
        expect(res.data.integration_changes.map((c: any) => c.created_at)).toEqual(
          [day(3), day(2), day(1)].map((d) => d.toISOString())
        )

        const page = await call("/admin/integrations/changes?limit=2&offset=2")
        expect(page.data).toMatchObject({ count: 3, limit: 2, offset: 2 })
        expect(page.data.integration_changes).toHaveLength(1)
        expect(page.data.integration_changes[0].created_at).toBe(day(1).toISOString())
      })

      it("honours an explicit order", async () => {
        await record(A, day(1))
        await record(A, day(2))
        const res = await call("/admin/integrations/changes?order=created_at")
        expect(res.data.integration_changes[0].created_at).toBe(day(1).toISOString())
      })

      it("rejects limit=500 with 400", async () => {
        expect((await call("/admin/integrations/changes?limit=500")).status).toBe(400)
      })

      it("filters by provider_id, change_type, actor_id and created_at, alone and combined", async () => {
        await record(A, day(1), { change_type: "created" })
        await record(A, day(2), { change_type: "enabled" })
        await record(B, day(3), { actor: { type: "user", id: "user_y" }, actor_label: "y@it.test" })
        await record(B, day(4), { change_type: "disabled" })

        const count = async (qs: string) => {
          const res = await call(`/admin/integrations/changes?${qs}`)
          expect(res.status).toBe(200)
          return res.data.count
        }
        expect(await count(`provider_id=${A}`)).toBe(2)
        expect(await count(`provider_id[]=${A}&provider_id[]=${B}`)).toBe(4)
        expect(await count("change_type=created")).toBe(1)
        expect(await count("actor_id=user_y")).toBe(1)
        expect(await count("actor_id=user_x")).toBe(3)
        expect(await count(`created_at[$gte]=${day(3).toISOString()}`)).toBe(2)
        expect(await count(`provider_id=${B}&actor_id=user_x&created_at[$gte]=${day(2).toISOString()}`)).toBe(1)
        expect(await count(`provider_id=${A}&change_type=enabled`)).toBe(1)
      })

      it("filters by author, System standing for everything but an admin user", async () => {
        await record(A, day(1))
        await record(A, day(2), { actor: { type: "user", id: "user_y" }, actor_label: "y@it.test" })
        await record(B, day(3), { actor: { type: "api-key", id: "apk_1" }, actor_label: "CI key" })
        await record(B, day(4), { actor: { type: "system" }, actor_label: null })

        const count = async (qs: string) => {
          const res = await call(`/admin/integrations/changes?${qs}`)
          expect(res.status).toBe(200)
          return res.data.count
        }
        expect(await count("actor_id=system")).toBe(2)
        expect(await count("actor_id=user_y&actor_id=system")).toBe(3)
        expect(await count("actor_id=user_x&actor_id=user_y")).toBe(2)
        // An API key's own id still finds its changes.
        expect(await count("actor_id=apk_1")).toBe(1)
        // Both the authors and the search narrow the list.
        expect(await count("actor_id=system&q=ci")).toBe(1)
        expect(await count("actor_id=user_x&actor_id=user_y&q=y@")).toBe(1)
        expect(await count(`actor_id=system&provider_id=${A}`)).toBe(0)
      })

      it("searches the author and the integration, case-insensitively and literally", async () => {
        await record(A, day(1))
        await record(B, day(2), { actor: { type: "user", id: "user_y" }, actor_label: "Anna@it.test" })

        const ids = async (qs: string) => (await call(`/admin/integrations/changes?${qs}`)).data.count
        expect(await ids("q=anna")).toBe(1)
        expect(await ids(`q=${B.slice(-3)}`)).toBe(1)
        expect(await ids("q=it.test")).toBe(2)
        // LIKE wildcards are matched as text, not as patterns.
        expect(await ids("q=%25")).toBe(0)
        expect(await ids(`q=anna&provider_id=${A}`)).toBe(0)
        expect((await call(`/admin/integrations/${B}/changes?q=x@`)).data.count).toBe(0)
      })

      it("finds a change by the options it touched, as the admin matched them in q_fields", async () => {
        await record(A, day(1), { diff: [{ field: "terminalKey", label: "test.terminalKey", from: 1, to: 2 }] })
        await record(B, day(2), { diff: [{ field: "apiKey", from: "a", to: "b" }] })
        await record(A, day(3))

        const count = async (qs: string) => (await call(`/admin/integrations/changes?${qs}`)).data.count
        // Nothing but the options matches "terminal": the author is x@it.test, the providers int_test_*.
        expect(await count("q=terminal")).toBe(0)
        expect(await count("q=terminal&q_fields=test.terminalKey")).toBe(1)
        expect(await count("q=key&q_fields=test.terminalKey&q_fields=apiKey")).toBe(2)
        // Still a search: it narrows nothing without q and ORs with the other columns.
        expect(await count("q_fields=apiKey")).toBe(3)
        expect(await count("q=it.test&q_fields=apiKey")).toBe(3)
        expect(await count(`q=key&q_fields=apiKey&provider_id=${A}`)).toBe(0)
      })

      it("finds a change by its integration's name, as the admin matched it in q_providers", async () => {
        await record(A, day(1))
        await record(B, day(2))

        const count = async (qs: string) => (await call(`/admin/integrations/changes?${qs}`)).data.count
        // The server has the name only as a translation key, so nothing else matches "kassa".
        expect(await count("q=kassa")).toBe(0)
        expect(await count(`q=kassa&q_providers=${A}`)).toBe(1)
        // Still a search: it narrows nothing without q and ORs with the other columns.
        expect(await count(`q_providers=${A}`)).toBe(2)
        expect(await count(`q=it.test&q_providers=${A}`)).toBe(2)
        expect(await count(`q=kassa&q_providers=${A}&provider_id=${B}`)).toBe(0)
      })

      it("sorts by the author", async () => {
        await record(A, day(1), { actor_label: "b@it.test" })
        await record(A, day(2), { actor_label: "a@it.test" })
        const res = await call("/admin/integrations/changes?order=actor_label")
        expect(res.data.integration_changes.map((c: any) => c.actor_label)).toEqual(["a@it.test", "b@it.test"])
      })

      it("returns the metadata stored with a change, and null for a change without it", async () => {
        await record(A, day(1))
        await record(A, day(2), { metadata: { source: "erp" } })
        const items = (await call("/admin/integrations/changes")).data.integration_changes
        expect(items.map((c: any) => c.metadata)).toEqual([{ source: "erp" }, null])
      })

      it("leaves ip, user_agent and request_id out of list items", async () => {
        await record(A, day(1))
        const [item] = (await call("/admin/integrations/changes")).data.integration_changes
        expect(item.id).toMatch(/^intch_/)
        expect(item).not.toHaveProperty("ip")
        expect(item).not.toHaveProperty("user_agent")
        expect(item).not.toHaveProperty("request_id")
      })

      it("is read-only: POST and DELETE are not declared", async () => {
        // A valid body, so the existing `POST /admin/integrations/:provider_id` (which would otherwise
        // answer 400 on body validation) reaches its provider check: "changes" is no provider.
        const post = await api.post("/admin/integrations/changes", { values: {} }, headers).catch((e: any) => e.response)
        expect(post.status).toBe(404)
        const del = await api.delete("/admin/integrations/changes", headers).catch((e: any) => e.response)
        expect(del.status).toBe(404)
        const put = await api.put("/admin/integrations/changes", { values: {} }, headers).catch((e: any) => e.response)
        expect(put.status).toBe(404)
      })
    })

    describe("GET /admin/integrations/changes/fields", () => {
      it("lists every option the history names, once, removed integrations included", async () => {
        await record(A, day(1), { diff: [{ field: "terminalKey", label: "test.terminalKey", from: 1, to: 2 }] })
        await record(A, day(2), { diff: [{ field: "terminalKey", label: "test.terminalKey", from: 2, to: 3 }] })
        await record("int_gone", day(3), { diff: [{ field: "apiKey", secret: true, op: "set" }] })
        const res = await call("/admin/integrations/changes/fields")
        expect(res.status).toBe(200)
        expect(res.data.fields).toEqual([
          { field: "apiKey", label: null },
          { field: "terminalKey", label: "test.terminalKey" },
        ])
      })

      it("leaves the stored keys out of list items", async () => {
        await record(A, day(1), { diff: [{ field: "terminalKey", label: "test.terminalKey", from: 1, to: 2 }] })
        const [item] = (await call("/admin/integrations/changes")).data.integration_changes
        expect(item).not.toHaveProperty("diff_fields")
      })
    })

    describe("GET /admin/integrations/changes/actors", () => {
      it("lists the admin users by their name or email now, a removed one by the stored email", async () => {
        const users = getContainer().resolve(Modules.USER)
        const [anna, boris] = await users.createUsers([
          { email: "anna@actors.test", first_name: "Anna", last_name: "Kim" },
          { email: "boris-now@actors.test" },
        ])
        await record(A, day(1), { actor: { type: "user", id: anna.id }, actor_label: "anna-old@actors.test" })
        await record(A, day(2), { actor: { type: "user", id: anna.id }, actor_label: "anna@actors.test" })
        await record(B, day(3), { actor: { type: "user", id: boris.id }, actor_label: "boris-then@actors.test" })
        await record(B, day(4), { actor: { type: "user", id: "user_gone" }, actor_label: "gone@actors.test" })
        await record(B, day(5), { actor: { type: "user", id: "user_nolabel" }, actor_label: null })

        const res = await call("/admin/integrations/changes/actors")
        expect(res.status).toBe(200)
        expect(res.data).toEqual({
          users: [
            { id: anna.id, label: "Anna Kim" },
            { id: boris.id, label: "boris-now@actors.test" },
            { id: "user_gone", label: "gone@actors.test" },
            { id: "user_nolabel", label: null },
          ],
          system: false,
        })
      })

      it("says whether anything but an admin user made changes", async () => {
        expect((await call("/admin/integrations/changes/actors")).data).toEqual({ users: [], system: false })
        await record(A, day(1), { actor: { type: "api-key", id: "apk_1" }, actor_label: "CI key" })
        expect((await call("/admin/integrations/changes/actors")).data).toEqual({ users: [], system: true })
      })
    })

    describe("GET /admin/integrations/changes/:id", () => {
      it("returns one change with the request origin columns", async () => {
        const row = await record(A, day(1), { metadata: { source: "erp" } })
        const res = await call(`/admin/integrations/changes/${row.id}`)
        expect(res.status).toBe(200)
        expect(res.data.integration_change).toMatchObject({
          id: row.id,
          provider_id: A,
          metadata: { source: "erp" },
          ip: "10.0.0.1",
          user_agent: "jest",
          request_id: "req_1",
        })
      })

      it("answers 404 for an unknown id", async () => {
        expect((await call("/admin/integrations/changes/intch_nope")).status).toBe(404)
      })
    })

    describe("GET /admin/integrations/:provider_id/changes", () => {
      it("returns only that provider's rows", async () => {
        await record(A, day(1))
        await record(B, day(2))
        await record(A, day(3))
        const res = await call(`/admin/integrations/${A}/changes`)
        expect(res.status).toBe(200)
        expect(res.data.count).toBe(2)
        expect(res.data.integration_changes.every((c: any) => c.provider_id === A)).toBe(true)
        expect(res.data.integration_changes[0].created_at).toBe(day(3).toISOString())
      })

      it("ignores a conflicting provider_id in the query string", async () => {
        await record(A, day(1))
        await record(B, day(2))
        const res = await call(`/admin/integrations/${A}/changes?provider_id=${B}`)
        expect(res.data.integration_changes.map((c: any) => c.provider_id)).toEqual([A])
      })

      it("answers 404 for an unregistered provider", async () => {
        expect((await call("/admin/integrations/int_unknown/changes")).status).toBe(404)
      })
    })

    describe("secrets", () => {
      it("never returns a plaintext secret from real changes", async () => {
        await save(A, { apiKey: "pub", secretKey: SECRET })
        await save(A, { apiKey: "pub", secretKey: "sk_history_api_other_456" })
        const list = await call("/admin/integrations/changes")
        const perProvider = await call(`/admin/integrations/${A}/changes`)
        const detail = await call(`/admin/integrations/changes/${list.data.integration_changes[0].id}`)
        for (const res of [list, perProvider, detail]) {
          expect(res.status).toBe(200)
          const body = JSON.stringify(res.data)
          expect(body).not.toContain(SECRET)
          expect(body).not.toContain("sk_history_api_other_456")
        }
        expect(list.data.count).toBe(2)
      })

      it("hides the values of a legacy row whose field is secret now, on all three routes", async () => {
        const row = await record(A, day(1), {
          diff: [
            { field: "secretKey", label: "test.secretKey", from: "plain-old", to: "plain-new" },
            { field: "apiKey", label: "test.apiKey", from: "pub", to: "pub2" },
          ],
        })
        const expected = [
          { field: "secretKey", label: "test.secretKey", secret: true, op: "hidden" },
          { field: "apiKey", label: "test.apiKey", from: "pub", to: "pub2" },
        ]
        const list = await call("/admin/integrations/changes")
        const perProvider = await call(`/admin/integrations/${A}/changes`)
        const detail = await call(`/admin/integrations/changes/${row.id}`)
        expect(list.data.integration_changes[0].diff).toEqual(expected)
        expect(perProvider.data.integration_changes[0].diff).toEqual(expected)
        expect(detail.data.integration_change.diff).toEqual(expected)
        for (const res of [list, perProvider, detail]) {
          const body = JSON.stringify(res.data)
          expect(body).not.toContain("plain-old")
          expect(body).not.toContain("plain-new")
        }
        // Asking only for `diff` must not drop the provider and with it the masking.
        const narrowList = await call("/admin/integrations/changes?fields=diff")
        const narrowDetail = await call(`/admin/integrations/changes/${row.id}?fields=diff`)
        expect(narrowList.data.integration_changes[0].diff).toEqual(expected)
        expect(narrowDetail.data.integration_change.diff).toEqual(expected)

        // The stored row is not rewritten.
        const [stored] = await svc.listIntegrationChanges({ id: row.id })
        expect(stored.diff[0]).toMatchObject({ from: "plain-old", to: "plain-new" })
      })

      it("returns a row of an unregistered provider as it is", async () => {
        const row = await record("int_gone", day(1), {
          diff: [{ field: "secretKey", from: "a", to: "b" }],
        })
        const res = await call(`/admin/integrations/changes/${row.id}`)
        expect(res.data.integration_change.diff).toEqual([{ field: "secretKey", from: "a", to: "b" }])
      })
    })
  },
})
