import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE } from "../../../modules/integration"
import type IntegrationModuleService from "../../../modules/integration/services/integration-module"

export type DeleteIntegrationRecordStepInput = {
  provider_id: string
}

export const deleteIntegrationRecordStep = createStep(
  "delete-integration-record",
  async (input: DeleteIntegrationRecordStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const existing = await service.findByProviderId(input.provider_id)
    if (!existing) return new StepResponse({ deleted: false })
    // Permanently remove the configuration and its stored credentials. Temporarily turning
    // an integration off is a separate action — POST /admin/integrations/:id/enable.
    await service.deleteIntegrations(existing.id)
    return new StepResponse({ deleted: true })
  }
)
