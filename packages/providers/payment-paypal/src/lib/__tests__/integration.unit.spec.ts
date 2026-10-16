import { MedusaError } from "@medusajs/framework/utils"
import { requirePayPalIntegration, resolvePayPalOptions } from "../integration"

function makeContainer(
  registrations: Array<{ identifier: string; instanceId: string | null }>,
  resolved: Record<string, unknown> | null = { options: { clientId: "client-id" } }
) {
  const keys = registrations.map((r) => `int_${r.identifier}${r.instanceId ? `_${r.instanceId}` : ""}`)
  const service = {
    hasProviderId: (id: string) => keys.includes(id),
    listUiDescriptors: () => registrations,
    getResolvedOptions: jest.fn().mockResolvedValue(resolved),
  }
  return { container: { resolve: () => service } as any, service }
}

describe("requirePayPalIntegration", () => {
  it("takes the instance named by provider_id", () => {
    const { container } = makeContainer([
      { identifier: "paypal", instanceId: "eu" },
      { identifier: "paypal", instanceId: "us" },
    ])

    expect(requirePayPalIntegration(container, "int_paypal_us")).toMatchObject({
      providerId: "int_paypal_us",
      instanceId: "us",
    })
  })

  it("takes the only registered instance when provider_id is omitted", () => {
    const { container } = makeContainer([
      { identifier: "tkassa", instanceId: "tkassa-1" },
      { identifier: "paypal", instanceId: "paypal-1" },
    ])

    expect(requirePayPalIntegration(container)).toMatchObject({ providerId: "int_paypal_paypal-1", instanceId: "paypal-1" })
  })

  it("takes the default instance registered without an id", () => {
    const { container } = makeContainer([{ identifier: "paypal", instanceId: null }])

    expect(requirePayPalIntegration(container)).toMatchObject({ providerId: "int_paypal", instanceId: null })
  })

  it("asks for provider_id when several instances are registered", () => {
    const { container } = makeContainer([
      { identifier: "paypal", instanceId: "eu" },
      { identifier: "paypal", instanceId: "us" },
    ])

    expect(() => requirePayPalIntegration(container)).toThrow(
      expect.objectContaining({ type: MedusaError.Types.INVALID_DATA })
    )
  })

  it.each(["int_paypal_unknown", "int_tkassa_tkassa-1", "pp_paypal_paypal"])("refuses %s", (providerId) => {
    const { container } = makeContainer([
      { identifier: "paypal", instanceId: "paypal-1" },
      { identifier: "tkassa", instanceId: "tkassa-1" },
    ])

    expect(() => requirePayPalIntegration(container, providerId)).toThrow(
      expect.objectContaining({ type: MedusaError.Types.NOT_FOUND })
    )
  })

  it("reports a missing registration", () => {
    const { container } = makeContainer([])

    expect(() => requirePayPalIntegration(container)).toThrow("No PayPal integration is registered")
  })
})

describe("resolvePayPalOptions", () => {
  it("returns the settings of the chosen instance", async () => {
    const { container, service } = makeContainer([{ identifier: "paypal", instanceId: "paypal-1" }])

    await expect(resolvePayPalOptions(container)).resolves.toEqual({
      providerId: "int_paypal_paypal-1",
      options: { clientId: "client-id" },
    })
    expect(service.getResolvedOptions).toHaveBeenCalledWith("paypal", "paypal-1")
  })

  it("refuses an instance that is disabled or not fully configured", async () => {
    const { container } = makeContainer([{ identifier: "paypal", instanceId: "paypal-1" }], null)

    await expect(resolvePayPalOptions(container)).rejects.toMatchObject({ type: MedusaError.Types.NOT_ALLOWED })
  })
})
