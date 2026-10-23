import { MedusaError } from "@medusajs/framework/utils"
import { requireStripeIntegration, resolveStripeOptions } from "../integration"

function makeContainer(
  registrations: Array<{ identifier: string; instanceId: string | null }>,
  resolved: Record<string, unknown> | null = { options: { publishableKey: "pk_test_x" } }
) {
  const keys = registrations.map((r) => `int_${r.identifier}${r.instanceId ? `_${r.instanceId}` : ""}`)
  const service = {
    hasProviderId: (id: string) => keys.includes(id),
    listUiDescriptors: () => registrations,
    getResolvedOptions: jest.fn().mockResolvedValue(resolved),
  }
  return { container: { resolve: () => service } as any, service }
}

describe("requireStripeIntegration", () => {
  it("takes the instance named by provider_id", () => {
    const { container } = makeContainer([
      { identifier: "stripe", instanceId: "eu" },
      { identifier: "stripe", instanceId: "us" },
    ])

    expect(requireStripeIntegration(container, "int_stripe_us")).toMatchObject({
      providerId: "int_stripe_us",
      instanceId: "us",
    })
  })

  it("takes the only registered instance when provider_id is omitted", () => {
    const { container } = makeContainer([
      { identifier: "tkassa", instanceId: "tkassa-1" },
      { identifier: "stripe", instanceId: "stripe-1" },
    ])

    expect(requireStripeIntegration(container)).toMatchObject({ providerId: "int_stripe_stripe-1", instanceId: "stripe-1" })
  })

  it("takes the default instance registered without an id", () => {
    const { container } = makeContainer([{ identifier: "stripe", instanceId: null }])

    expect(requireStripeIntegration(container)).toMatchObject({ providerId: "int_stripe", instanceId: null })
  })

  it("asks for provider_id when several instances are registered", () => {
    const { container } = makeContainer([
      { identifier: "stripe", instanceId: "eu" },
      { identifier: "stripe", instanceId: "us" },
    ])

    expect(() => requireStripeIntegration(container)).toThrow(
      expect.objectContaining({ type: MedusaError.Types.INVALID_DATA })
    )
  })

  it.each(["int_stripe_unknown", "int_tkassa_tkassa-1", "pp_stripe_stripe"])("refuses %s", (providerId) => {
    const { container } = makeContainer([
      { identifier: "stripe", instanceId: "stripe-1" },
      { identifier: "tkassa", instanceId: "tkassa-1" },
    ])

    expect(() => requireStripeIntegration(container, providerId)).toThrow(
      expect.objectContaining({ type: MedusaError.Types.NOT_FOUND })
    )
  })

  it("reports a missing registration", () => {
    const { container } = makeContainer([])

    expect(() => requireStripeIntegration(container)).toThrow("No Stripe integration is registered")
  })
})

describe("resolveStripeOptions", () => {
  it("returns the settings of the chosen instance", async () => {
    const { container, service } = makeContainer([{ identifier: "stripe", instanceId: "stripe-1" }])

    await expect(resolveStripeOptions(container)).resolves.toEqual({
      providerId: "int_stripe_stripe-1",
      options: { publishableKey: "pk_test_x" },
    })
    expect(service.getResolvedOptions).toHaveBeenCalledWith("stripe", "stripe-1")
  })

  it("refuses an instance that is disabled or not fully configured", async () => {
    const { container } = makeContainer([{ identifier: "stripe", instanceId: "stripe-1" }], null)

    await expect(resolveStripeOptions(container)).rejects.toMatchObject({ type: MedusaError.Types.NOT_ALLOWED })
  })
})
