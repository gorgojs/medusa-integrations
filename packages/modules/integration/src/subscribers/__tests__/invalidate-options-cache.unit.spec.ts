import { describe, expect, it, jest } from "@jest/globals"
import invalidateOptionsCache, { config } from "../invalidate-options-cache"
import { INTEGRATION_MODULE } from "../../modules/integration"

describe("invalidate-options-cache subscriber", () => {
  it("clears the resolved-options cache for the event's provider_id", async () => {
    const clearOptionsCache = jest.fn()
    const container: any = {
      resolve: (key: string) => (key === INTEGRATION_MODULE ? { clearOptionsCache } : undefined),
    }
    await invalidateOptionsCache({ event: { data: { provider_id: "int_demo" } }, container } as any)
    expect(clearOptionsCache).toHaveBeenCalledTimes(1)
    expect(clearOptionsCache).toHaveBeenCalledWith("int_demo")
  })

  it("subscribes to integration.updated", () => {
    expect(config.event).toBe("integration.updated")
  })
})
