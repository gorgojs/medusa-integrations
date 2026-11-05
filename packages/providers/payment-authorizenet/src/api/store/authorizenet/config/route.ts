import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { StoreAuthorizeNetConfigResponse } from "../../../../types/http"
import { getAuthorizeNetConfigWorkflow } from "../../../../workflows/get-authorizenet-config"
import { StoreAuthorizeNetInstanceQueryType } from "../validators"

export const GET = async (
  req: MedusaRequest<unknown, StoreAuthorizeNetInstanceQueryType>,
  res: MedusaResponse<StoreAuthorizeNetConfigResponse>
) => {
  const { result } = await getAuthorizeNetConfigWorkflow(req.scope).run({
    input: { provider_id: req.validatedQuery.provider_id },
  })

  res.status(200).json({ config: result })
}
