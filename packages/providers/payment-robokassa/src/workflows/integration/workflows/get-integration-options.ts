import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getIntegrationOptionsStep } from "../steps"

export type GetIntegrationOptionsWorkflowInput = {
  identifier: string
  instance_id?: string | null
}

export const getIntegrationOptionsWorkflowId = "get-integration-options"

export const getIntegrationOptionsWorkflow = createWorkflow(
  getIntegrationOptionsWorkflowId,
  (input: GetIntegrationOptionsWorkflowInput) => {
    const options = getIntegrationOptionsStep({
      identifier: input.identifier,
      instance_id: input.instance_id
    })
    return new WorkflowResponse(options)
  }
)
