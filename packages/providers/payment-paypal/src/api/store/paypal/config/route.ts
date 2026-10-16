import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { StorePayPalConfigResponse } from "../../../../types/http"
import { getPayPalConfigWorkflow } from "../../../../workflows/get-paypal-config"
import { StorePayPalInstanceQueryType } from "../validators"

export const GET = async (
  req: MedusaRequest<unknown, StorePayPalInstanceQueryType>,
  res: MedusaResponse<StorePayPalConfigResponse>
) => {
  const { result } = await getPayPalConfigWorkflow(req.scope).run({
    input: { provider_id: req.validatedQuery.provider_id },
  })

  res.status(200).json({ config: result })
}
