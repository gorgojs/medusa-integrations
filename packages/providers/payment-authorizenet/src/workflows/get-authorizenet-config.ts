import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getAuthorizeNetConfigStep } from "./steps/get-authorizenet-config"

export type GetAuthorizeNetConfigWorkflowInput = {
  provider_id?: string
}

export const getAuthorizeNetConfigWorkflow = createWorkflow(
  "authorizenet-get-config",
  (input: GetAuthorizeNetConfigWorkflowInput) => {
    const config = getAuthorizeNetConfigStep({ provider_id: input.provider_id })
    return new WorkflowResponse(config)
  }
)
