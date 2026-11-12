import { describe, expect, it } from "@jest/globals"
import { createMedusaContainer } from "@medusajs/framework/utils"
import { registerIntegrationProvider } from "../register-provider"
import { AbstractIntegrationProviderService } from "../../utils/abstract-integration-provider"
import { defineIntegration } from "../../descriptor/define"
import { IntegrationProviderRegistrationKey } from "../../types"

const descriptor = defineIntegration({ category: "payment", displayName: "d", options: {}, sections: [] })

class CrmProvider extends AbstractIntegrationProviderService {
  static identifier = "crm"
  get descriptor() {
    return descriptor
  }
}

const register = (container: any, id?: string) =>
  registerIntegrationProvider(CrmProvider, container, { id, options: {} })

describe("registerIntegrationProvider", () => {
  it("registers a provider without an id as the default instance", () => {
    const container = createMedusaContainer()
    register(container)

    expect(container.resolve<AbstractIntegrationProviderService>("int_crm_default").getInstanceId()).toBe("default")
    expect(container.resolve(IntegrationProviderRegistrationKey)).toEqual(["int_crm_default"])
  })

  it("registers a provider with an id as that instance", () => {
    const container = createMedusaContainer()
    register(container, "eu")
    register(container, "us")

    expect(container.resolve<AbstractIntegrationProviderService>("int_crm_eu").getInstanceId()).toBe("eu")
    expect(container.resolve<AbstractIntegrationProviderService>("int_crm_us").getInstanceId()).toBe("us")
    expect([...container.resolve<string[]>(IntegrationProviderRegistrationKey)].sort()).toEqual([
      "int_crm_eu",
      "int_crm_us",
    ])
  })

  it("refuses a second registration of the same instance", () => {
    const container = createMedusaContainer()
    register(container, "eu")

    expect(() => register(container, "eu")).toThrow(/"int_crm_eu".*more than once/)
  })

  it("refuses an id of default next to a registration without an id", () => {
    const container = createMedusaContainer()
    register(container)

    expect(() => register(container, "default")).toThrow(/"int_crm_default".*more than once/)
  })
})
