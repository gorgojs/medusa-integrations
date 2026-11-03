import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { deleteIntegrationRecordStep, emitIntegrationEventStep, recordIntegrationChangeStep } from "../steps"
import type { IntegrationChangeActor } from "../../../types/integration/history"

export type DeleteIntegrationWorkflowInput = {
  provider_id: string
  /** Who makes the change, for the change history. Defaults to `{ type: "system" }`. */
  actor?: IntegrationChangeActor
}

export const deleteIntegrationWorkflowId = "delete-integration"

export const deleteIntegrationWorkflow = createWorkflow(
  deleteIntegrationWorkflowId,
  function (input: DeleteIntegrationWorkflowInput) {
    const result = deleteIntegrationRecordStep(transform({ input }, (d) => ({ provider_id: d.input.provider_id })))
    recordIntegrationChangeStep(
      transform({ input, result }, (d) => ({
        provider_id: d.input.provider_id,
        change_type: "deleted" as const,
        actor: d.input.actor ?? null,
        // A snapshot of what was configured, so the integration can be set up again.
        diff: d.result.diff,
        skip: !d.result.deleted,
      }))
    )
    emitIntegrationEventStep(
      transform({ input }, (d) => ({
        name: "integration.updated",
        data: {
          provider_id: d.input.provider_id,
          change: "delete",
          actor: d.input.actor ? { type: d.input.actor.type, id: d.input.actor.id ?? null } : null,
        },
      }))
    )
    return new WorkflowResponse(result)
  }
)
