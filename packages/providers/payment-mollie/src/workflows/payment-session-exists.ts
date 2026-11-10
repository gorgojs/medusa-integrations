import { container } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Whether a payment session still exists. Medusa deletes a session for good when it replaces it, so
 * a Mollie payment whose session is gone belongs to no cart any more. Read through Query in the
 * global container, which the payment module's own container does not have.
 */
export async function paymentSessionExists(sessionId: string): Promise<boolean> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "payment_session",
    fields: ["id"],
    filters: { id: sessionId },
  })
  return (data as Array<{ id?: string }>).length > 0
}
