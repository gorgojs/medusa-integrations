import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { resolvePayPalOptions } from "../../lib/integration"
import { PayPalClient } from "../../lib/paypal-client"
import { toPayPalPayer } from "../../utils/payer"

export type GetPayPalPayerStepInput = {
  provider_id?: string
  order_id: string
  payment_collection_id: string
}

/**
 * The buyer's contact and shipping address from a PayPal order, only when the order was created for
 * this cart's payment collection. Any other order is reported as not found, so a storefront cannot
 * read someone else's address by order id.
 */
export const getPayPalPayerStep = createStep(
  "get-paypal-payer-step",
  async ({ provider_id, order_id, payment_collection_id }: GetPayPalPayerStepInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const { options } = await resolvePayPalOptions(container, provider_id)
    const client = new PayPalClient({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      environment: options.environment,
      logger,
    })

    const notFound = new MedusaError(MedusaError.Types.NOT_FOUND, `PayPal order ${order_id} was not found for this cart`)
    let order
    try {
      order = await client.getOrder(order_id)
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        throw notFound
      }
      throw error
    }
    if (order.purchase_units?.[0]?.reference_id !== payment_collection_id) {
      logger.debug(`get-paypal-payer-step: order ${order_id} does not belong to payment collection ${payment_collection_id}`)
      throw notFound
    }
    return new StepResponse(toPayPalPayer(order))
  }
)
