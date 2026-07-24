import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { INTEGRATION_MODULE } from "../../../modules/integration"
import type IntegrationModuleService from "../../../modules/integration/services/integration-module"

export type SetIntegrationEnabledStepInput = {
  provider_id: string
  is_enabled: boolean
}

export const setIntegrationEnabledStep = createStep(
  "set-integration-enabled",
  async (input: SetIntegrationEnabledStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const existing = await service.findByProviderId(input.provider_id)
    // Enabling/disabling only applies to a configured integration (an existing row).
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Integration "${input.provider_id}" is not configured`
      )
    }
    const record = await service.updateIntegrations({
      id: existing.id,
      is_enabled: input.is_enabled,
    })
    return new StepResponse(record, { id: existing.id, previous: existing.is_enabled })
  },
  // Roll back to the previous enabled state if a later step fails.
  async (compensate, { container }) => {
    if (!compensate) return
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    await service.updateIntegrations({ id: compensate.id, is_enabled: compensate.previous })
  }
)
