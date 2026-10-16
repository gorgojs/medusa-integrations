import { container } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"

export type GetPaymentCollectionIdWorkflowInput = {
  session_id: string
}

export const getPaymentCollectionIdWorkflowId = "paypal-get-payment-collection-id"

export const getPaymentCollectionIdWorkflow = createWorkflow(
  getPaymentCollectionIdWorkflowId,
  (input: GetPaymentCollectionIdWorkflowInput) => {
    const { data } = useQueryGraphStep({
      entity: "payment_session",
      fields: ["id", "payment_collection_id"],
      filters: { id: input.session_id },
    })
    return new WorkflowResponse(data)
  }
)

/**
 * The payment collection of a payment session. A payment provider lives in the
 * payment module's own container, which has no Query, so the workflow runs in
 * the global container.
 */
export async function getPaymentCollectionId(sessionId: string): Promise<string> {
  const { result } = await getPaymentCollectionIdWorkflow(container).run({ input: { session_id: sessionId } })
  const collectionId = (result as Array<{ payment_collection_id?: string }> | undefined)?.[0]?.payment_collection_id
  if (!collectionId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Payment session ${sessionId} has no payment collection`
    )
  }
  return collectionId
}
