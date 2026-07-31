import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { StoreApishipProviderListResponse } from "../../../../types/http"
import { getApishipProvidersWorkflow } from "../../../../workflows/get-apiship-providers"
import { StoreApishipInstanceQueryType } from "../validators"

export const GET = async (
  req: MedusaRequest<unknown, StoreApishipInstanceQueryType>,
  res: MedusaResponse<StoreApishipProviderListResponse>
) => {
  const { shipping_option_id, provider_id } = req.validatedQuery

  const { result } = await getApishipProvidersWorkflow(
    req.scope
  ).run({
    input: { shipping_option_id, provider_id, mode: "resolved" },
  })

  res.status(200).json({
    providers: result,
  })
}
