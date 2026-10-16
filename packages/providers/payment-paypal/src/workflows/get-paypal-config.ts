import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getPayPalConfigStep } from "./steps/get-paypal-config"

export type GetPayPalConfigWorkflowInput = {
  provider_id?: string
}

export const getPayPalConfigWorkflow = createWorkflow(
  "get-paypal-config",
  (input: GetPayPalConfigWorkflowInput) => {
    const config = getPayPalConfigStep({ provider_id: input.provider_id })
    return new WorkflowResponse(config)
  }
)
