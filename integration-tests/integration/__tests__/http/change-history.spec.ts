import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import testIntegrationConnectionsJob from "@gorgo/medusa-integration/jobs/test-integration-connections"
import { createAdminHeaders } from "../utils/admin"

jest.setTimeout(120 * 1000)

const A = "int_test_a"
const SECRET = "sk_history_secret_value_123"
const OTHER_SECRET = "sk_history_secret_value_456"

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

    const save = (values: Record<string, unknown>, auth = headers) =>
      api.post(`/admin/integrations/${A}`, { section_id: "creds", values }, auth)

    const changesOf = (provider_id = A) =>
      svc.listIntegrationChanges({ provider_id }, { order: { created_at: "ASC" }, take: 100 })

    const rawRows = async () => {
      const pg = getContainer().resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const result = await pg.raw(`select * from integration_change`)
      return JSON.stringify(result.rows)
    }

    it("records the first save as created, with the author and every written field", async () => {
      await save({ apiKey: "pub", secretKey: SECRET })

      const [change] = await changesOf()
      expect(change).toMatchObject({
        change_type: "created",
        provider_id: A,
        actor_type: "user",
        actor_label: "admin@it.test",
      })
      expect(change.actor_id).toMatch(/^user_/)
      expect(change.diff).toEqual([
        { field: "apiKey", label: "test.apiKey", from: null, to: "pub" },
        { field: "secretKey", label: "test.secretKey", secret: true, op: "set" },
      ])
    })

    it("records an edit with only the field that changed, and nothing for a save without changes", async () => {
      await save({ apiKey: "pub", secretKey: SECRET })
      await save({ apiKey: "pub2", secretKey: "" })
      await save({ apiKey: "pub2", secretKey: "" })

      const changes = await changesOf()
      expect(changes.map((c: any) => c.change_type)).toEqual(["created", "updated"])
      expect(changes[1].diff).toEqual([{ field: "apiKey", label: "test.apiKey", from: "pub", to: "pub2" }])
    })

    it("records a replaced secret without its value or its ciphertext", async () => {
      await save({ apiKey: "pub", secretKey: SECRET })
      await save({ apiKey: "pub", secretKey: OTHER_SECRET })

      const changes = await changesOf()
      expect(changes[1].diff).toEqual([{ field: "secretKey", label: "test.secretKey", secret: true, op: "replaced" }])

      const [row] = await svc.listIntegrations({ provider_id: A }, { take: 1 })
      const raw = await rawRows()
      expect(raw).not.toContain(SECRET)
      expect(raw).not.toContain(OTHER_SECRET)
      expect(raw).not.toContain(row.options.secretKey)
    })

    it("never puts option values into the integration.updated event", async () => {
      const eventBus = getContainer().resolve(Modules.EVENT_BUS)
      const emit = jest.spyOn(eventBus, "emit")
      try {
        await save({ apiKey: "pub", secretKey: SECRET })
        const call = emit.mock.calls.map((c: any[]) => c[0]).find((e: any) => e?.name === "integration.updated")
        expect(call.data).toMatchObject({ provider_id: A, fields: ["apiKey", "secretKey"] })
        expect(call.data.actor).toMatchObject({ type: "user" })
        expect(JSON.stringify(call)).not.toContain(SECRET)
        expect(JSON.stringify(call)).not.toContain("pub")
      } finally {
        emit.mockRestore()
      }
    })

    it("tells disabling from enabling in the integration.updated event", async () => {
      await save({ apiKey: "pub", secretKey: SECRET })
      const eventBus = getContainer().resolve(Modules.EVENT_BUS)
      const emit = jest.spyOn(eventBus, "emit")
      try {
        await api.post(`/admin/integrations/${A}/enable`, { is_enabled: false }, headers)
        await api.post(`/admin/integrations/${A}/enable`, { is_enabled: true }, headers)
        const changes = emit.mock.calls
          .map((c: any[]) => c[0])
          .filter((e: any) => e?.name === "integration.updated")
          .map((e: any) => e.data.change)
        expect(changes).toEqual(["disabled", "enabled"])
      } finally {
        emit.mockRestore()
      }
    })

    it("records disabling and enabling, but not a toggle to the current state", async () => {
      await save({ apiKey: "pub", secretKey: SECRET })
      await api.post(`/admin/integrations/${A}/enable`, { is_enabled: false }, headers)
      await api.post(`/admin/integrations/${A}/enable`, { is_enabled: false }, headers)
      await api.post(`/admin/integrations/${A}/enable`, { is_enabled: true }, headers)

      const changes = await changesOf()
      expect(changes.map((c: any) => c.change_type)).toEqual(["created", "disabled", "enabled"])
      expect(changes[1].diff).toEqual([])
    })

    it("records a deletion with a snapshot, and keeps the history after the integration is gone", async () => {
      await save({ apiKey: "pub", secretKey: SECRET, mode: "live" })
      const del = await api.delete(`/admin/integrations/${A}`, headers)
      expect(del.status).toBe(200)

      expect(await svc.listIntegrations({ provider_id: A }, { take: 1 })).toHaveLength(0)
      const changes = await changesOf()
      expect(changes.map((c: any) => c.change_type)).toEqual(["created", "deleted"])
      expect(changes[1].diff).toEqual([
        { field: "apiKey", label: "test.apiKey", from: "pub", to: null },
        { field: "secretKey", label: "test.secretKey", secret: true, op: "removed" },
        { field: "mode", label: "test.mode", from: "live", to: null },
      ])
      expect(await rawRows()).not.toContain(SECRET)
    })

    it("records no connection test: neither one run from the admin nor the daily job", async () => {
      await save({ apiKey: "pub", secretKey: SECRET })
      const res = await api.post(`/admin/integrations/${A}/test-connection`, {}, headers)
      expect(res.data.status).toBe("passed")
      await testIntegrationConnectionsJob(getContainer())

      const changes = await changesOf()
      expect(changes.map((c: any) => c.change_type)).toEqual(["created"])
    })

    it("records a change made with a secret API key under the key's title", async () => {
      const apiKeys = getContainer().resolve(Modules.API_KEY)
      const key = await apiKeys.createApiKeys({ title: "History bot", type: "secret", created_by: "test" })
      await save({ apiKey: "pub", secretKey: SECRET }, { headers: { authorization: `Basic ${key.token}` } })

      const [change] = await changesOf()
      expect(change).toMatchObject({ change_type: "created", actor_type: "api-key", actor_id: key.id, actor_label: "History bot" })
    })
  },
})
