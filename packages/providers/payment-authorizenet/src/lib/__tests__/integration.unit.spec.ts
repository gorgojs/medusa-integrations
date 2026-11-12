import { MedusaError } from "@medusajs/framework/utils"
import { requireAuthorizeNetIntegration, resolveAuthorizeNetOptions } from "../integration"

function makeContainer(
  registrations: Array<{ identifier: string; instanceId: string }>,
  resolved: Record<string, unknown> | null = { options: { apiLoginId: "login" } }
) {
  const keys = registrations.map((r) => `int_${r.identifier}_${r.instanceId}`)
  const service = {
    hasProviderId: (id: string) => keys.includes(id),
    listUiDescriptors: () => registrations,
    getResolvedOptions: jest.fn().mockResolvedValue(resolved),
  }
  return { container: { resolve: () => service } as any, service }
}

describe("requireAuthorizeNetIntegration", () => {
  it("takes the instance named by provider_id", () => {
    const { container } = makeContainer([
      { identifier: "authorizenet", instanceId: "eu" },
      { identifier: "authorizenet", instanceId: "us" },
    ])

    expect(requireAuthorizeNetIntegration(container, "int_authorizenet_us")).toMatchObject({
      providerId: "int_authorizenet_us",
      instanceId: "us",
    })
  })

  it("takes the only registered instance when provider_id is omitted", () => {
    const { container } = makeContainer([
      { identifier: "tkassa", instanceId: "tkassa-1" },
      { identifier: "authorizenet", instanceId: "authorizenet-1" },
    ])

    expect(requireAuthorizeNetIntegration(container)).toMatchObject({ providerId: "int_authorizenet_authorizenet-1", instanceId: "authorizenet-1" })
  })

  it("takes the default instance registered without an id", () => {
    const { container } = makeContainer([{ identifier: "authorizenet", instanceId: "default" }])

    expect(requireAuthorizeNetIntegration(container)).toMatchObject({ providerId: "int_authorizenet_default", instanceId: "default" })
  })

  it("asks for provider_id when several instances are registered", () => {
    const { container } = makeContainer([
      { identifier: "authorizenet", instanceId: "eu" },
      { identifier: "authorizenet", instanceId: "us" },
    ])

    expect(() => requireAuthorizeNetIntegration(container)).toThrow(
      expect.objectContaining({ type: MedusaError.Types.INVALID_DATA })
    )
  })

  it.each(["int_authorizenet_unknown", "int_tkassa_tkassa-1", "pp_authorizenet_authorizenet"])("refuses %s", (providerId) => {
    const { container } = makeContainer([
      { identifier: "authorizenet", instanceId: "authorizenet-1" },
      { identifier: "tkassa", instanceId: "tkassa-1" },
    ])

    expect(() => requireAuthorizeNetIntegration(container, providerId)).toThrow(
      expect.objectContaining({ type: MedusaError.Types.NOT_FOUND })
    )
  })

  it("reports a missing registration", () => {
    const { container } = makeContainer([])

    expect(() => requireAuthorizeNetIntegration(container)).toThrow("No Authorize.net integration is registered")
  })
})

describe("resolveAuthorizeNetOptions", () => {
  it("returns the settings of the chosen instance", async () => {
    const { container, service } = makeContainer([{ identifier: "authorizenet", instanceId: "authorizenet-1" }])

    await expect(resolveAuthorizeNetOptions(container)).resolves.toEqual({
      providerId: "int_authorizenet_authorizenet-1",
      options: { apiLoginId: "login" },
    })
    expect(service.getResolvedOptions).toHaveBeenCalledWith("authorizenet", "authorizenet-1")
  })

  it("refuses an instance that is disabled or not fully configured", async () => {
    const { container } = makeContainer([{ identifier: "authorizenet", instanceId: "authorizenet-1" }], null)

    await expect(resolveAuthorizeNetOptions(container)).rejects.toMatchObject({ type: MedusaError.Types.NOT_ALLOWED })
  })
})
