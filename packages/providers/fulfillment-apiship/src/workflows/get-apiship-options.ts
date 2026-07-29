import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { getApishipOptionsStep } from "./steps/get-apiship-options"

export type GetApishipOptionsWorkflowInput = {
  provider_id?: string
}

export const getApishipOptionsWorkflow = createWorkflow(
  "get-apiship-options",
  (input: GetApishipOptionsWorkflowInput = {}) => {
    const apishipOptions = getApishipOptionsStep(input)
    return new WorkflowResponse(apishipOptions)
  }
)