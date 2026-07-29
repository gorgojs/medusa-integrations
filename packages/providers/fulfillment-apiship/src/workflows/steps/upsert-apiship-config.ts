import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE, IntegrationModuleService } from "@gorgo/medusa-integration"
import { DEFAULT_APISHIP_PROVIDER_ID } from "../../types/apiship"

export type UpsertApishipConfigStepInput = {
  values: Record<string, unknown>
  provider_id?: string
}

export const upsertApishipConfigStep = createStep(
  "upsert-apiship-config-step",
  async ({ values, provider_id }: UpsertApishipConfigStepInput, { container }) => {
    const providerId = provider_id ?? DEFAULT_APISHIP_PROVIDER_ID
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const descriptor = service.getProviderDescriptor(providerId)!
    const options = service.encryptForStorage(descriptor, values)
    const existing = await service.findByProviderId(providerId)

    const record = existing
      ? await service.updateIntegrations({ id: existing.id, options, is_enabled: true })
      : await service.createIntegrations({ provider_id: providerId, category: "fulfillment", options, is_enabled: true })

    service.clearOptionsCache(providerId)
    return new StepResponse(record)
  }
)
