import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { getStoreStep } from "./steps/get-store"
import { getApishipOptionsStep } from "./steps/get-apiship-options"
import { validateApishipOptionsStep } from "./steps/validate-apiship-options"

export const getApishipClientConfigWorkflow = createWorkflow(
  "get-apiship-client-config",
  () => {
    const store = getStoreStep()
    const apishipOptions = getApishipOptionsStep({ store })
    const apishipClientConfig = validateApishipOptionsStep({
      apishipOptions
    })

    return new WorkflowResponse(apishipClientConfig)
  }

)
