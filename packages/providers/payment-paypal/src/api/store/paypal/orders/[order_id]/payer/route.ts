import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { StorePayPalPayerResponse } from "../../../../../../types/http"
import { getPayPalPayerWorkflow } from "../../../../../../workflows/get-paypal-payer"
import { StoreGetPayPalPayerType } from "../../../validators"

export const GET = async (
  req: MedusaRequest<unknown, StoreGetPayPalPayerType>,
  res: MedusaResponse<StorePayPalPayerResponse>
) => {
  const { cart_id, provider_id } = req.validatedQuery

  const { result } = await getPayPalPayerWorkflow(req.scope).run({
    input: { cart_id, order_id: req.params.order_id, provider_id },
  })

  res.status(200).json({ payer: result })
}
