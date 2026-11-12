import crypto from "crypto"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminHeaders } from "../utils/admin"

jest.setTimeout(120 * 1000)

const A = "int_test_a"

/** The passphrase medusa-config.ts registers the module with. */
const PASSPHRASE = process.env.INTEGRATION_ENCRYPTION_KEY || "supersecret"

/** A secret the way 0.x stored it: base64 of iv ‖ tag ‖ ciphertext, with no version prefix. */
function legacyBlob(value: unknown): string {
  const key = crypto.createHash("sha256").update(PASSPHRASE, "utf8").digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const enc = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64")
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let svc: any
    let headers: { headers: Record<string, string> }

    beforeAll(async () => {
      svc = getContainer().resolve("integration")
      headers = await createAdminHeaders(api, getContainer())
    })

    beforeEach(async () => {
      const rows = await svc.listIntegrations({}, { take: 1000 })
      if (rows.length) await svc.deleteIntegrations(rows.map((r: any) => r.id))
      svc.clearOptionsCache()
    })

    it("reads a secret that 0.x stored, with no migration", async () => {
      await svc.createIntegrations({
        provider_id: A,
        category: "payment",
        options: { apiKey: "pub", secretKey: legacyBlob("sk_from_0x") },
        is_enabled: true,
      })

      const resolved = await svc.getResolvedOptions("test", "a")

      expect(resolved?.options.secretKey).toBe("sk_from_0x")
    })

    it("stores a secret saved through the Admin API in the versioned format", async () => {
      const res = await api.post(
        `/admin/integrations/${A}`,
        { section_id: "creds", values: { apiKey: "pub", secretKey: "sk_new" } },
        headers
      )
      expect(res.status).toBe(200)

      const [row] = await svc.listIntegrations({ provider_id: A })
      expect(row.options.secretKey).toMatch(/^v1:/)
      expect((await svc.getResolvedOptions("test", "a"))?.options.secretKey).toBe("sk_new")
    })

    it("keeps reading a 0.x secret after another option of its section is saved", async () => {
      await svc.createIntegrations({
        provider_id: A,
        category: "payment",
        options: { apiKey: "pub", secretKey: legacyBlob("sk_from_0x") },
        is_enabled: true,
      })

      // A blank secret keeps the stored value, so the 0.x value stays as it was written.
      await api.post(
        `/admin/integrations/${A}`,
        { section_id: "creds", values: { apiKey: "pub2", secretKey: "" } },
        headers
      )

      const resolved = await svc.getResolvedOptions("test", "a")
      expect(resolved?.options).toMatchObject({ apiKey: "pub2", secretKey: "sk_from_0x" })
    })
  },
})
