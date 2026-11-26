import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE } from "../../../modules/integration"
import type IntegrationModuleService from "../../../modules/integration/services/integration-module"
import type { CategoryKind } from "../../../modules/integration/descriptor/define"

export type UpsertIntegrationRecordStepInput = {
  provider_id: string
  category: CategoryKind
  options: Record<string, unknown>
  title?: string | null
  /** Merged into the stored metadata key by key, as Medusa does: `""` removes a key, `null` clears it all. */
  metadata?: Record<string, unknown> | null
}

export const upsertIntegrationRecordStep = createStep(
  "upsert-integration-record",
  async (input: UpsertIntegrationRecordStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const existing = await service.findByProviderId(input.provider_id)
    let record
    if (existing) {
      // Metadata goes through the row lock, so a plugin writing its own key at the same time keeps it.
      const { metadata, ...rest } = input
      record = await service.updateIntegrations({ id: existing.id, ...rest })
      if (metadata !== undefined) {
        await service.mergeIntegrationMetadata(input.provider_id, metadata)
        record = await service.retrieveIntegration(existing.id)
      }
    } else {
      record = await service.createIntegrations(input)
    }
    return new StepResponse(record, { id: record.id, existed: !!existing })
  }
)
