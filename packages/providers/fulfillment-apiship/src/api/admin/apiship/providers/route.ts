import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AdminApishipProviderListResponse } from "../../../../types/http"
import { getApishipProvidersWorkflow } from "../../../../workflows/get-apiship-providers"
import { AdminApishipProviderIdQueryType } from "../validators"

export const GET = async (
  req: MedusaRequest<unknown, AdminApishipProviderIdQueryType>,
  res: MedusaResponse<AdminApishipProviderListResponse>
) => {
  const { provider_id } = req.validatedQuery

  const { result } = await getApishipProvidersWorkflow(
    req.scope
  ).run({
    input: { provider_id },
  })

  res.status(200).json({
    providers: result
  })
}