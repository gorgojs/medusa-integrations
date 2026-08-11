/**
 * Integration tests for admin API: /admin/apiship/options
 *
 * No live ApiShip API token needed — these endpoints only read/write
 * the encrypted config row via @gorgo/medusa-integration's IntegrationModuleService.
 *
 * Ownership split after the integration-module migration:
 *   - everything except the connection list is a descriptor SECTION (credentials, payment &
 *     VAT, default product sizes, sender), written through
 *     POST /admin/integrations/:provider_id and read back from its GET. The token never
 *     leaves the server.
 *   - the connection list is plugin-owned (a list of records has no descriptor control), and
 *     is the only thing /admin/apiship/options reads and writes.
 *
 * State management:
 *   medusaIntegrationTestRunner wipes the DB after every it() block.
 *   Each test is fully self-contained.
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import jwt from "jsonwebtoken"

jest.setTimeout(120 * 1000)

// Matches the named instance declared in medusa-config.ts (APISHIP_INTEGRATION_ID).
const PROVIDER_ID = "int_apiship_apiship-1"
const OPTIONS_URL = `/admin/apiship/options?provider_id=${PROVIDER_ID}`
const INTEGRATION_URL = `/admin/integrations/${PROVIDER_ID}`

/** The one thing this plugin's own route still writes. */
const CONNECTION = {
  id: "ascon_seed",
  name: "CDEK",
  provider_key: "cdek",
  provider_connect_id: "1",
  is_enabled: true,
}

/** Sender values, written through the descriptor's `sender` section. */
const SENDER = {
  sender_country_code: "RU",
  sender_address_string: "Москва, Тверская, 1",
  sender_contact_name: "Test User",
  sender_phone: "+70000000000",
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    const headers: Record<string, string> = {}

    /** Write one descriptor section the way the module's own drawer does. */
    const saveSection = (sectionId: string, values: Record<string, unknown>) =>
      api
        .post(INTEGRATION_URL, { section_id: sectionId, values }, { headers })
        .catch((e: any) => e.response)

    /** Write credentials the way the admin UI does — through the integration module. */
    const setCredentials = (values: { token?: string; is_test?: boolean }) =>
      saveSection("credentials", values)

    /** The module's masked view of the row: non-secret option values, secrets listed by name. */
    const readIntegration = async () => (await api.get(INTEGRATION_URL, { headers })).data

    /** What the runtime will actually use, after the descriptor's schema + assembly. */
    const readResolved = async () => {
      const svc = getContainer().resolve("integration") as any
      svc.clearOptionsCache(PROVIDER_ID)
      return (await svc.getResolvedOptions("apiship", "apiship-1"))?.options ?? null
    }

    // Create an admin user + JWT token before every test.
    // medusaIntegrationTestRunner re-runs module loaders between tests,
    // so the user must be created fresh each time.
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
    // GET /admin/apiship/options
    // -------------------------------------------------------------------------
    describe("GET /admin/apiship/options", () => {
      it("returns an empty connection list when apiship is not configured yet", async () => {
        const res = await api.get(OPTIONS_URL, { headers })

        expect(res.status).toBe(200)
        expect(res.data.apiship_options).toEqual({ connections: [] })
      })

      it("exposes nothing but the connection list — no token, no descriptor options", async () => {
        await setCredentials({ token: "live-token-abc", is_test: true })
        await saveSection("sender", SENDER)

        const res = await api.get(OPTIONS_URL, { headers })

        expect(res.status).toBe(200)
        expect(Object.keys(res.data.apiship_options)).toEqual(["connections"])
        expect(JSON.stringify(res.data)).not.toContain("live-token-abc")
      })

      it("requires authentication — 401 without token", async () => {
        const res = await api.get(OPTIONS_URL).catch((e: any) => e.response)

        expect(res.status).toBe(401)
      })

      it("returns 404 for an unregistered provider_id", async () => {
        const res = await api
          .get("/admin/apiship/options?provider_id=int_apiship_nope", { headers })
          .catch((e: any) => e.response)

        expect(res.status).toBe(404)
      })
    })

    // -------------------------------------------------------------------------
    // POST /admin/apiship/options
    // -------------------------------------------------------------------------
    describe("POST /admin/apiship/options", () => {
      it("replaces the connection list and returns it", async () => {
        const res = await api.post(OPTIONS_URL, { connections: [CONNECTION] }, { headers })

        expect(res.status).toBe(200)
        expect(res.data.apiship_options.connections).toHaveLength(1)
        expect(res.data.apiship_options.connections[0].provider_key).toBe("cdek")
      })

      it("persists to store — subsequent GET returns updated values", async () => {
        await api.post(OPTIONS_URL, { connections: [CONNECTION] }, { headers })

        const res = await api.get(OPTIONS_URL, { headers })

        expect(res.status).toBe(200)
        expect(res.data.apiship_options.connections).toHaveLength(1)
      })

      it("leaves the list untouched when `connections` is omitted", async () => {
        await api.post(OPTIONS_URL, { connections: [CONNECTION] }, { headers })
        await api.post(OPTIONS_URL, {}, { headers })

        const res = await api.get(OPTIONS_URL, { headers })
        expect(res.data.apiship_options.connections).toHaveLength(1)
      })

      it("does not clobber credentials or descriptor-owned options", async () => {
        await setCredentials({ token: "keep-me", is_test: true })
        await saveSection("default_product_sizes", { default_product_weight: 1000 })
        await saveSection("sender", SENDER)

        await api.post(OPTIONS_URL, { connections: [CONNECTION] }, { headers })

        const { integration } = await readIntegration()
        expect(integration.is_enabled).toBe(true)
        expect(integration.values.is_test).toBe(true)
        expect(integration.values.default_product_weight).toBe(1000)
        expect(integration.values.sender_country_code).toBe("RU")
        // The stored (still encrypted) token survived the blob write.
        expect(integration.configured_secrets).toContain("token")

        const res = await api.get(OPTIONS_URL, { headers })
        expect(res.data.apiship_options.connections).toHaveLength(1)
      })

      it("does not re-enable an integration that was turned off", async () => {
        await setCredentials({ token: "tok" })
        await api.post(`${INTEGRATION_URL}/enable`, { is_enabled: false }, { headers })

        await api.post(OPTIONS_URL, { connections: [CONNECTION] }, { headers })

        const { integration } = await readIntegration()
        expect(integration.is_enabled).toBe(false)
      })

      // Everything below moved to a descriptor section. Silently stripping it here would look
      // like a successful save, so the route rejects unknown keys outright.
      it.each([
        ["token", { token: "tok" }],
        ["is_test", { is_test: true }],
        ["is_cod", { is_cod: true }],
        ["delivery_cost_vat", { delivery_cost_vat: 20 }],
        ["default_product_length", { default_product_length: 50 }],
        ["sender_country_code", { sender_country_code: "RU" }],
        ["the old nested settings blob", { settings: { connections: [CONNECTION] } }],
      ])("rejects %s", async (_name, body) => {
        const res = await api
          .post(OPTIONS_URL, body, { headers })
          .catch((e: any) => e.response)

        expect(res.status).toBe(400)
      })

      it("returns 400 when a connection field has the wrong type", async () => {
        const res = await api
          .post(OPTIONS_URL, { connections: [{ ...CONNECTION, is_enabled: "yes" }] }, { headers })
          .catch((e: any) => e.response)

        expect(res.status).toBe(400)
      })

      it("requires authentication — 401 without token", async () => {
        const res = await api
          .post(OPTIONS_URL, { connections: [CONNECTION] })
          .catch((e: any) => e.response)

        expect(res.status).toBe(401)
      })
    })

    // -------------------------------------------------------------------------
    // Descriptor sections — rendered, validated and stored by the integration module.
    // -------------------------------------------------------------------------
    describe("descriptor sections", () => {
      it("resolves the declared defaults for a config that only has a token", async () => {
        await setCredentials({ token: "tok" })

        expect(await readResolved()).toMatchObject({
          is_cod: false,
          delivery_cost_vat: -1,
          default_product_length: 10,
          default_product_width: 10,
          default_product_height: 10,
          default_product_weight: 20,
        })
      })

      it("writes payment & VAT", async () => {
        await setCredentials({ token: "tok" })
        expect((await saveSection("payment_and_tax", { is_cod: true, delivery_cost_vat: 20 })).status).toBe(200)

        expect(await readResolved()).toMatchObject({ is_cod: true, delivery_cost_vat: 20 })
      })

      it("writes the default product sizes", async () => {
        await setCredentials({ token: "tok" })
        await saveSection("default_product_sizes", {
          default_product_length: 30,
          default_product_width: 20,
          default_product_height: 15,
          default_product_weight: 500,
        })

        expect(await readResolved()).toMatchObject({
          default_product_length: 30,
          default_product_width: 20,
          default_product_height: 15,
          default_product_weight: 500,
        })
      })

      it("writes the sender", async () => {
        await setCredentials({ token: "tok" })
        expect((await saveSection("sender", SENDER)).status).toBe(200)

        expect(await readResolved()).toMatchObject(SENDER)
      })

      it("re-applies the default when a size is cleared", async () => {
        await setCredentials({ token: "tok" })
        await saveSection("default_product_sizes", { default_product_weight: 500 })
        expect(await readResolved()).toMatchObject({ default_product_weight: 500 })

        // The number control sends null for a cleared field.
        await saveSection("default_product_sizes", { default_product_weight: null })
        expect(await readResolved()).toMatchObject({ default_product_weight: 20 })
      })

      it("400s on a VAT rate ApiShip doesn't support", async () => {
        expect((await saveSection("payment_and_tax", { delivery_cost_vat: 18 })).status).toBe(400)
      })

      it("400s on a non-positive size", async () => {
        expect((await saveSection("default_product_sizes", { default_product_length: 0 })).status).toBe(400)
      })

      it("400s on a country outside ISO 3166-1 alpha-2", async () => {
        expect((await saveSection("sender", { sender_country_code: "XX" })).status).toBe(400)
        // The pre-descriptor combobox rendered lower case; upper case is what got persisted.
        expect((await saveSection("sender", { sender_country_code: "ru" })).status).toBe(400)
      })

      it("leaves the connection list alone", async () => {
        await api.post(OPTIONS_URL, { connections: [CONNECTION] }, { headers })
        await saveSection("payment_and_tax", { is_cod: true })

        const res = await api.get(OPTIONS_URL, { headers })
        expect(res.data.apiship_options.connections).toHaveLength(1)
      })
    })
  },
})
