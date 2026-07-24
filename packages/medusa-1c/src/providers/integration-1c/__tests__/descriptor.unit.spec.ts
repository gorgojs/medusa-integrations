// Settings storage moved off the plugin's own `onec` DB model and onto the integration
// descriptor. These tests exercise the composed schema (defaults, structural validation)
// and full/activation validation via `collectValidationIssues`.
import OnecIntegrationProvider from "../services/onec-integration"
import { collectValidationIssues } from "@gorgo/medusa-integration"

const descriptor = new OnecIntegrationProvider().descriptor
const schema = descriptor.optionsSchema

describe("1C integration descriptor schema", () => {
  it("applies defaults for an empty config", () => {
    const res = schema.safeParse({})
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.interval).toBe(0)
      expect(res.data.chunkSize).toBe(10 * 1024 * 1024)
      expect(res.data.useZip).toBe(false)
    }
  })

  it("is complete with just defaults (no required fields)", () => {
    expect(collectValidationIssues(descriptor, {})).toEqual([])
  })

  it("accepts attribute-id fields as arbitrary strings", () => {
    const res = schema.safeParse({
      height: "prop-1",
      width: "prop-2",
      mid_code: "prop-3",
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.height).toBe("prop-1")
      expect(res.data.mid_code).toBe("prop-3")
    }
  })

  it("rejects a non-numeric interval", () => {
    const res = schema.safeParse({ interval: "not-a-number" })
    expect(res.success).toBe(false)
  })

  it("rejects a negative chunkSize", () => {
    const res = schema.safeParse({ chunkSize: -1 })
    expect(res.success).toBe(false)
  })
})

describe("1C integration testConnection", () => {
  const defaults = schema.parse({})

  it("passes once the sync settings resolve (defaults applied)", async () => {
    await expect(descriptor.testConnection!({ options: defaults })).resolves.toEqual({
      status: "passed",
    })
  })

  it("fails if a sync setting is missing", async () => {
    const { useZip, ...rest } = defaults
    await expect(descriptor.testConnection!({ options: rest })).resolves.toMatchObject({
      status: "failed",
    })
  })
})
