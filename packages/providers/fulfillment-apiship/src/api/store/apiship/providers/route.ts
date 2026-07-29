import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { StoreApishipProviderListResponse } from "../../../../types/http"
import { getApishipProvidersWorkflow } from "../../../../workflows/get-apiship-providers"
import { StoreApishipProviderIdQueryType } from "../validators"

export const GET = async (
  req: MedusaRequest<unknown, StoreApishipProviderIdQueryType>,
  res: MedusaResponse<StoreApishipProviderListResponse>
) => {
  const { provider_id, shipping_option_id } = req.validatedQuery

  const { result } = await getApishipProvidersWorkflow(
    req.scope
  ).run({
    input: { provider_id, shipping_option_id },
  })

  res.status(200).json({
    providers: result,
  })
}
