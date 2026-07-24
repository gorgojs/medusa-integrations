import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import {
  applyIntegrationSectionStep,
  upsertIntegrationRecordStep,
  emitIntegrationEventStep
} from "../steps"

export type UpsertIntegrationWorkflowInput = {
  provider_id: string
  section_id?: string | null
  title?: string | null
  values: Record<string, unknown>
}

export const upsertIntegrationWorkflowId = "upsert-integration"

export const upsertIntegrationWorkflow = createWorkflow(
  upsertIntegrationWorkflowId,
  function (input: UpsertIntegrationWorkflowInput) {
    const prepared = applyIntegrationSectionStep({
      provider_id: input.provider_id,
      section_id: input.section_id ?? null,
      values: input.values,
    })

    const recordInput = transform({ input, prepared }, (data) => ({
      provider_id: data.input.provider_id,
      title: data.input.title ?? null,
      category: data.prepared.category,
      options: data.prepared.options,
    }))

    const record = upsertIntegrationRecordStep(recordInput)

    emitIntegrationEventStep(
      transform({ input }, (d) => ({
        name: "integration.updated",
        data: {
          provider_id: d.input.provider_id,
          change: "update",
        },
      }))
    )

    return new WorkflowResponse(record)
  }
)
