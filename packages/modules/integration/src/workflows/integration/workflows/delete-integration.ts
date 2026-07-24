import { createWorkflow, WorkflowResponse, transform } from "@medusajs/framework/workflows-sdk"
import { deleteIntegrationRecordStep, emitIntegrationEventStep } from "../steps"

export type DeleteIntegrationWorkflowInput = {
  provider_id: string
}

export const deleteIntegrationWorkflowId = "delete-integration"

export const deleteIntegrationWorkflow = createWorkflow(
  deleteIntegrationWorkflowId,
  function (input: DeleteIntegrationWorkflowInput) {
    const result = deleteIntegrationRecordStep(input)
    emitIntegrationEventStep(
      transform({ input }, (d) => ({
        name: "integration.updated",
        data: {
          provider_id: d.input.provider_id,
          change: "delete",
        },
      }))
    )
    return new WorkflowResponse(result)
  }
)
