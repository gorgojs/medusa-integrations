/**
 * Integration tests for admin API: /admin/apiship/options
 *
 * Tests GET and POST endpoints for ApiShip options management.
 * No live ApiShip API token needed — these endpoints only read/write
 * the encrypted config row via @gorgo/medusa-integration's IntegrationModuleService.
 *
 * State management:
 *   medusaIntegrationTestRunner wipes the DB after every it() block.
 *   Each test is fully self-contained.
 */

import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import jwt from "jsonwebtoken"

jest.setTimeout(120 * 1000)

// Matches the named instance declared in medusa-config.ts (APISHIP_INTEGRATION_ID).
const OPTIONS_URL = "/admin/apiship/options?provider_id=int_apiship_apiship-1"

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    const headers: Record<string, string> = {}

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
      it("returns default options when apiship is not configured yet", async () => {
        const res = await api.get(OPTIONS_URL, { headers })

        expect(res.status).toBe(200)
        expect(res.data.apiship_options).toBeDefined()

        const opts = res.data.apiship_options
        expect(opts.token).toBe("")
        expect(opts.is_test).toBe(false)
        expect(opts.settings.is_cod).toBe(false)
        expect(opts.settings.delivery_cost_vat).toBe(-1)
        expect(Array.isArray(opts.settings.connections)).toBe(true)
        expect(opts.settings.connections).toHaveLength(0)
        expect(opts.settings.default_product_sizes.length).toBe(10)
        expect(opts.settings.default_product_sizes.weight).toBe(20)
      })

      it("requires authentication — 401 without token", async () => {
        const res = await api.get(OPTIONS_URL).catch((e: any) => e.response)

        expect(res.status).toBe(401)
      })
    })

    // -------------------------------------------------------------------------
    // POST /admin/apiship/options
    // -------------------------------------------------------------------------
    describe("POST /admin/apiship/options", () => {
      it("updates token and is_test, returns merged options", async () => {
        const res = await api.post(
          OPTIONS_URL,
          { token: "live-token-abc", is_test: true },
          { headers }
        )

        expect(res.status).toBe(200)
        const opts = res.data.apiship_options
        expect(opts.token).toBe("live-token-abc")
        expect(opts.is_test).toBe(true)
        // Settings not sent — framework defaults applied
        expect(opts.settings).toBeDefined()
      })

      it("persists to store — subsequent GET returns updated values", async () => {
        await api.post(
          OPTIONS_URL,
          { token: "my-token", is_test: true },
          { headers }
        )

        const res = await api.get(OPTIONS_URL, { headers })

        expect(res.status).toBe(200)
        expect(res.data.apiship_options.token).toBe("my-token")
        expect(res.data.apiship_options.is_test).toBe(true)
      })

      it("merges partial settings — unrelated fields are preserved", async () => {
        // Establish full state
        await api.post(
          OPTIONS_URL,
          {
            token: "tok",
            is_test: true,
            settings: {
              is_cod: false,
              default_product_sizes: { length: 10, width: 10, height: 10, weight: 20 },
            },
          },
          { headers }
        )

        // Partial update: only sender settings
        await api.post(
          OPTIONS_URL,
          {
            settings: {
              default_sender_settings: {
                country_code: "RU",
                contact_name: "Test User",
                phone: "+70000000000",
                address_string: "Москва, Тверская, 1",
              },
            },
          },
          { headers }
        )

        const res = await api.get(OPTIONS_URL, { headers })
        const opts = res.data.apiship_options

        // Original fields must be preserved
        expect(opts.token).toBe("tok")
        expect(opts.is_test).toBe(true)
        // Newly written fields must be there
        expect(opts.settings.default_sender_settings.country_code).toBe("RU")
        expect(opts.settings.default_sender_settings.contact_name).toBe("Test User")
      })

      it("updates default_product_sizes without touching sender settings", async () => {
        await api.post(
          OPTIONS_URL,
          {
            token: "tok",
            is_test: false,
            settings: {
              is_cod: false,
              default_product_sizes: { length: 10, width: 10, height: 10, weight: 20 },
              default_sender_settings: { country_code: "RU", phone: "+70000000000" },
            },
          },
          { headers }
        )

        await api.post(
          OPTIONS_URL,
          { settings: { default_product_sizes: { length: 50, width: 30, height: 25, weight: 1000 } } },
          { headers }
        )

        const res = await api.get(OPTIONS_URL, { headers })
        const opts = res.data.apiship_options

        expect(opts.settings.default_product_sizes.length).toBe(50)
        expect(opts.settings.default_product_sizes.weight).toBe(1000)
        // Sender settings untouched
        expect(opts.settings.default_sender_settings.country_code).toBe("RU")
      })

      it("returns 400 when is_test is not a boolean", async () => {
        const res = await api
          .post(OPTIONS_URL, { is_test: "yes" }, { headers })
          .catch((e: any) => e.response)

        expect(res.status).toBe(400)
      })

      it("requires authentication — 401 without token", async () => {
        const res = await api
          .post(OPTIONS_URL, { token: "tok" })
          .catch((e: any) => e.response)

        expect(res.status).toBe(401)
      })
    })
  },
})
