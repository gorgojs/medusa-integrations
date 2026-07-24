import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

export type GetShippingOptionStepInput = {
  id: string
}

export const getShippingOptionStep = createStep(
  "get-shipping-option-step",
  async (input: GetShippingOptionStepInput, { container }) => {
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
    const shippingOption = await fulfillmentModuleService.retrieveShippingOption(
      input.id
    )
    return new StepResponse(shippingOption)
  }
)

type GetShippingOptionWorkflowInput = {
  id: string
}

export const getShippingOptionWorkflow = createWorkflow(
  "get-shipping-option",
  (input: GetShippingOptionWorkflowInput) => {
    const shippingOption = getShippingOptionStep(input)
    return new WorkflowResponse(shippingOption)
  }
)