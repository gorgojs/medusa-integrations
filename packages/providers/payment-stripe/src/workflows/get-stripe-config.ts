import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getStripeConfigStep } from "./steps/get-stripe-config"

export type GetStripeConfigWorkflowInput = {
  provider_id?: string
}

export const getStripeConfigWorkflow = createWorkflow(
  "stripe-get-config",
  (input: GetStripeConfigWorkflowInput) => {
    const config = getStripeConfigStep({ provider_id: input.provider_id })
    return new WorkflowResponse(config)
  }
)
