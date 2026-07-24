import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { removeShippingMethodFromCartStep } from "@medusajs/medusa/core-flows"

export const removeShippingMethodFromCartWorkflow = createWorkflow(
  "remove-shipping-method-from-cart",
  (input: { shipping_method_ids: string[] }) => {
    const result = removeShippingMethodFromCartStep({
      shipping_method_ids: input.shipping_method_ids,
    })
    return new WorkflowResponse({ result })
  }
)