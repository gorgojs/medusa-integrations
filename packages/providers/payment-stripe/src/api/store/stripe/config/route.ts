import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { StoreStripeConfigResponse } from "../../../../types/http"
import { getStripeConfigWorkflow } from "../../../../workflows/get-stripe-config"
import { StoreStripeInstanceQueryType } from "../validators"

export const GET = async (
  req: MedusaRequest<unknown, StoreStripeInstanceQueryType>,
  res: MedusaResponse<StoreStripeConfigResponse>
) => {
  const { result } = await getStripeConfigWorkflow(req.scope).run({
    input: { provider_id: req.validatedQuery.provider_id },
  })

  res.status(200).json({ config: result })
}
