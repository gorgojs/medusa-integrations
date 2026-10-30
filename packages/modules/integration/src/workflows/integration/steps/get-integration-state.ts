import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE } from "../../../modules/integration"
import type IntegrationModuleService from "../../../modules/integration/services/integration-module"

export type GetIntegrationStateStepInput = {
  provider_id: string
}

/** What a change needs to know about the integration before it happens. No option values. */
export type IntegrationState = {
  existed: boolean
  title: string | null
  is_enabled: boolean | null
}

/**
 * Read the stored row's state before a workflow changes it, so the change history can tell a
 * first save from an edit and a real toggle from a repeated one.
 */
export const getIntegrationStateStep = createStep(
  "get-integration-state",
  async (input: GetIntegrationStateStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const existing = await service.findByProviderId(input.provider_id)
    const state: IntegrationState = {
      existed: !!existing,
      title: existing?.title ?? null,
      is_enabled: existing ? existing.is_enabled : null,
    }
    return new StepResponse(state)
  }
)
