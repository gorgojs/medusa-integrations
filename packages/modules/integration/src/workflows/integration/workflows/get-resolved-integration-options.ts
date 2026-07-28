import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getResolvedIntegrationOptionsStep } from "../steps"

export type GetResolvedIntegrationOptionsWorkflowInput = {
  identifier: string
  instance_id?: string | null
}

export const getResolvedIntegrationOptionsWorkflowId = "get-resolved-integration-options"

export const getResolvedIntegrationOptionsWorkflow = createWorkflow(
  getResolvedIntegrationOptionsWorkflowId,
  (input: GetResolvedIntegrationOptionsWorkflowInput) =>
    new WorkflowResponse(getResolvedIntegrationOptionsStep(input))
)
