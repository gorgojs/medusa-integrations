import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE } from "../../../modules/integration"
import type IntegrationModuleService from "../../../modules/integration/services/integration-module"

export type GetResolvedIntegrationOptionsStepInput = {
  identifier: string
  instance_id?: string | null
}

export const getResolvedIntegrationOptionsStepId = "get-resolved-integration-options"

export const getResolvedIntegrationOptionsStep = createStep(
  getResolvedIntegrationOptionsStepId,
  async (input: GetResolvedIntegrationOptionsStepInput, { container }) => {
    const service = container.resolve(INTEGRATION_MODULE) as IntegrationModuleService
    const resolved = await service.getResolvedOptions(input.identifier, input.instance_id)
    return new StepResponse(resolved)
  }
)
