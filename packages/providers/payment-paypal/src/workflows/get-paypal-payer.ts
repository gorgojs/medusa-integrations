import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { getPayPalPayerStep } from "./steps/get-paypal-payer"

export type GetPayPalPayerWorkflowInput = {
  cart_id: string
  order_id: string
  provider_id?: string
}

export const getPayPalPayerWorkflow = createWorkflow(
  "get-paypal-payer",
  (input: GetPayPalPayerWorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields: ["id", "payment_collection.id"],
      filters: { id: input.cart_id },
      options: { throwIfKeyNotFound: true },
    })
    const paymentCollectionId = transform({ carts }, ({ carts }) => carts[0]?.payment_collection?.id ?? "")

    const payer = getPayPalPayerStep({
      provider_id: input.provider_id,
      order_id: input.order_id,
      payment_collection_id: paymentCollectionId,
    })
    return new WorkflowResponse(payer)
  }
)
