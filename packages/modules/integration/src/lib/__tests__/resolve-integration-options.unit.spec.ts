import { MedusaError } from "@medusajs/framework/utils"
import { unwrapResolvedOptions } from "../resolve-integration-options"
import type { ResolvedOptions } from "../../modules/integration/services/integration-module"

const resolved: ResolvedOptions = {
  options: { terminalKey: "tk", password: "pw" },
  meta: { provider_id: "int_tkassa", category: "payment", is_enabled: true },
}

describe("unwrapResolvedOptions", () => {
  it("returns the resolved options when present", () => {
    const out = unwrapResolvedOptions<{ terminalKey: string; password: string }>(resolved, "tkassa")
    expect(out).toEqual({ terminalKey: "tk", password: "pw" })
  })

  it("throws a NOT_ALLOWED MedusaError naming the identifier when not configured", () => {
    expect(() => unwrapResolvedOptions(null, "tkassa")).toThrow(MedusaError)
    try {
      unwrapResolvedOptions(null, "tkassa")
      throw new Error("expected to throw")
    } catch (e: any) {
      expect(e.type).toBe(MedusaError.Types.NOT_ALLOWED)
      expect(e.message).toContain('"tkassa"')
    }
  })

  it("returns null when not configured and optional is true", () => {
    expect(unwrapResolvedOptions(null, "tkassa", true)).toBeNull()
  })
})
