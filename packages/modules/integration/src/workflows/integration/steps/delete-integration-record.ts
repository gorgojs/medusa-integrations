import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { INTEGRATION_MODULE } from "../../../modules/integration"
import type IntegrationModuleService from "../../../modules/integration/services/integration-module"
import { diffOptions } from "../../../modules/integration/descriptor/diff"
import type { DiffEntry } from "../../../types/integration/history"

export type DeleteIntegrationRecordStepInput = {
  provider_id: string
}

export const deleteIntegrationRecordStep = createStep(
  "delete-integration-record",
  async (input: DeleteIntegrationRecordStepInput, { container }) => {
    const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)
    const existing = await service.findByProviderId(input.provider_id)
    if (!existing) return new StepResponse({ deleted: false, diff: [] as DiffEntry[] })
    // For the change history: what was configured, from the stored row as-is. Plain options are
    // stored in clear text; a secret only needs to be present to be reported as removed, so
    // nothing is decrypted here.
    const descriptor = service.getProviderDescriptor(input.provider_id)
    const diff = descriptor ? diffOptions(descriptor, (existing.options ?? {}) as Record<string, unknown>, {}) : []
    // Permanently remove the configuration and its stored credentials. Temporarily turning
    // an integration off is a separate action — POST /admin/integrations/:id/enable.
    await service.deleteIntegrations(existing.id)
    return new StepResponse({ deleted: true, diff })
  }
)
