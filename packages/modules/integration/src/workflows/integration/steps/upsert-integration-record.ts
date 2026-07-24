import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE } from "../../../modules/integration"
import type IntegrationModuleService from "../../../modules/integration/services/integration-module"
import type { CategoryKind } from "../../../modules/integration/descriptor/define"

export type UpsertIntegrationRecordStepInput = {
  provider_id: string
  category: CategoryKind
  options: Record<string, unknown>
  title?: string | null
}

export const upsertIntegrationRecordStep = createStep(
  "upsert-integration-record",
  async (input: UpsertIntegrationRecordStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const existing = await service.findByProviderId(input.provider_id)
    let record
    if (existing) {
      record = await service.updateIntegrations({ id: existing.id, ...input })
    } else {
      record = await service.createIntegrations(input)
    }
    return new StepResponse(record, { id: record.id, existed: !!existing })
  }
)
