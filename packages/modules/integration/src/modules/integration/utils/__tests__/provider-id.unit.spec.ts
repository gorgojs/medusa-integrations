import { integrationProviderKey, parseIntegrationProviderKey } from "../provider-id"
import IntegrationProviderService from "../../services/integration-provider"

describe("integrationProviderKey", () => {
  it("keys the default instance without a suffix", () => {
    expect(integrationProviderKey("apiship")).toBe("int_apiship")
    expect(integrationProviderKey("apiship", null)).toBe("int_apiship")
    expect(integrationProviderKey("apiship", "")).toBe("int_apiship")
  })

  it("appends a named instance", () => {
    expect(integrationProviderKey("apiship", "apiship-1")).toBe("int_apiship_apiship-1")
  })

  it("is the same key the registry uses", () => {
    expect(IntegrationProviderService.key("apiship", "eu")).toBe(
      integrationProviderKey("apiship", "eu")
    )
  })
})

describe("parseIntegrationProviderKey", () => {
  it("recognises the default instance", () => {
    expect(parseIntegrationProviderKey("int_apiship", "apiship")).toEqual({
      identifier: "apiship",
      instanceId: null,
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

  it("rejects another provider's key", () => {
    expect(parseIntegrationProviderKey("int_tkassa", "apiship")).toBeNull()
    expect(parseIntegrationProviderKey("int_tkassa_1", "apiship")).toBeNull()
    // A different identifier that merely starts with the same characters.
    expect(parseIntegrationProviderKey("int_apishipx", "apiship")).toBeNull()
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
    for (const instanceId of [null, "a", "apiship-1", "eu_west"]) {
      const key = integrationProviderKey("apiship", instanceId)
      expect(parseIntegrationProviderKey(key, "apiship")).toEqual({
        identifier: "apiship",
        instanceId,
      })
    }
  })
})
