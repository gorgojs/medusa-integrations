import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AdminApishipProviderListResponse } from "../../../../types/http"
import { getApishipProvidersWorkflow } from "../../../../workflows/get-apiship-providers"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse<AdminApishipProviderListResponse>
) => {
  const { result } = await getApishipProvidersWorkflow(
    req.scope
  ).run()
  
  res.status(200).json({
    providers: result
  })
}