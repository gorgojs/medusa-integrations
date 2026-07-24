import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { getStoreStep } from "./steps/get-store"
import { getApishipOptionsStep } from "./steps/get-apiship-options"

export const getApishipOptionsWorkflow = createWorkflow(
  "get-apiship-options",
  () => {
    const store = getStoreStep()
    const apishipOptions = getApishipOptionsStep({store})
    return new WorkflowResponse(apishipOptions)
  }
)