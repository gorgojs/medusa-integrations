import { describe, expect, it } from "@jest/globals"
import { AbstractIntegrationProvider, AbstractIntegrationProviderService } from "../abstract-integration-provider"
import { defineIntegration } from "../../descriptor/define"

const descriptor = defineIntegration({ category: "payment", displayName: "d", options: {}, sections: [] })

// A provider written before 1.0, against the old name.
class LegacyProvider extends AbstractIntegrationProvider {
  static identifier = "legacy"
  get descriptor() {
    return descriptor
  }
}

describe("AbstractIntegrationProvider", () => {
  it("is the deprecated name of AbstractIntegrationProviderService, as a value and as a type", () => {
    const provider: AbstractIntegrationProviderService = new LegacyProvider(undefined, undefined, "shop-2")
    const typedByOldName: AbstractIntegrationProvider = provider

    expect(AbstractIntegrationProvider).toBe(AbstractIntegrationProviderService)
    expect(typedByOldName).toBeInstanceOf(AbstractIntegrationProviderService)
    expect(provider.getIdentifier()).toBe("legacy")
    expect(provider.getInstanceId()).toBe("shop-2")
  })
})

describe("AbstractIntegrationProviderService.getInstanceId", () => {
  it("is default for a provider created without an instance id", () => {
    expect(new LegacyProvider().getInstanceId()).toBe("default")
    expect(new LegacyProvider(undefined, undefined, null).getInstanceId()).toBe("default")
    expect(new LegacyProvider(undefined, undefined, "").getInstanceId()).toBe("default")
  })
})
