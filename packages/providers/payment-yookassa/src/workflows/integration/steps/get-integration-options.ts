import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE, IntegrationModuleService } from "@gorgo/medusa-integration"

export type GetIntegrationOptionsStepInput = {
  identifier: string
  instance_id?: string | null
}

export const getIntegrationOptionsStep = createStep(
  "get-integration-options",
  async (input: GetIntegrationOptionsStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const resolved = await service.getResolvedOptions(input.identifier, input.instance_id)
    return new StepResponse(resolved)
  }
)
