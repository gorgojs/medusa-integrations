import { DEFAULT_INSTANCE_ID, integrationProviderKey, parseIntegrationProviderKey } from "../provider-id"
import IntegrationProviderService from "../../services/integration-provider"

describe("integrationProviderKey", () => {
  it("keys a registration without an id as the default instance", () => {
    expect(integrationProviderKey("apiship")).toBe("int_apiship_default")
    expect(integrationProviderKey("apiship", null)).toBe("int_apiship_default")
    expect(integrationProviderKey("apiship", "")).toBe("int_apiship_default")
  })

  it("names the default instance default", () => {
    expect(DEFAULT_INSTANCE_ID).toBe("default")
    expect(integrationProviderKey("apiship", "default")).toBe("int_apiship_default")
  })

  it("appends a named instance", () => {
    expect(integrationProviderKey("apiship", "apiship-1")).toBe("int_apiship_apiship-1")
  })

  it("is the same key the registry uses", () => {
    expect(IntegrationProviderService.key("apiship", "eu")).toBe("int_apiship_eu")
    expect(IntegrationProviderService.key("apiship")).toBe("int_apiship_default")
  })
})

describe("parseIntegrationProviderKey", () => {
  it("recognises the default instance", () => {
    expect(parseIntegrationProviderKey("int_apiship_default", "apiship")).toEqual({
      identifier: "apiship",
      instanceId: "default",
    })
  })

  it("extracts a named instance", () => {
    expect(parseIntegrationProviderKey("int_apiship_apiship-1", "apiship")).toEqual({
      identifier: "apiship",
      instanceId: "apiship-1",
    })
  })

  it("keeps underscores inside the instance id", () => {
    expect(parseIntegrationProviderKey("int_apiship_eu_west", "apiship")).toEqual({
      identifier: "apiship",
      instanceId: "eu_west",
    })
  })

  it("rejects a key without an instance, the format before 2.0", () => {
    expect(parseIntegrationProviderKey("int_apiship", "apiship")).toBeNull()
  })

  it("rejects another provider's key", () => {
    expect(parseIntegrationProviderKey("int_tkassa_default", "apiship")).toBeNull()
    expect(parseIntegrationProviderKey("int_tkassa_1", "apiship")).toBeNull()
    // A different identifier that merely starts with the same characters.
    expect(parseIntegrationProviderKey("int_apishipx_default", "apiship")).toBeNull()
  })

  it("rejects malformed and empty input", () => {
    expect(parseIntegrationProviderKey(undefined, "apiship")).toBeNull()
    expect(parseIntegrationProviderKey(null, "apiship")).toBeNull()
    expect(parseIntegrationProviderKey("", "apiship")).toBeNull()
    expect(parseIntegrationProviderKey("apiship", "apiship")).toBeNull()
    // Trailing separator with no instance id.
    expect(parseIntegrationProviderKey("int_apiship_", "apiship")).toBeNull()
  })

  it("round-trips with integrationProviderKey", () => {
    const cases: Array<[string | null, string]> = [
      [null, "default"],
      ["a", "a"],
      ["apiship-1", "apiship-1"],
      ["eu_west", "eu_west"],
    ]
    for (const [given, instanceId] of cases) {
      const key = integrationProviderKey("apiship", given)
      expect(parseIntegrationProviderKey(key, "apiship")).toEqual({ identifier: "apiship", instanceId })
    }
  })
})
