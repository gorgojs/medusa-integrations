import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getApishipTariffsWorkflow } from "../../../../workflows/get-apiship-tariffs"
import { AdminGetApishipTariffsParamsType } from "../validators"

export const GET = async (
  req: MedusaRequest<unknown, AdminGetApishipTariffsParamsType>,
  res: MedusaResponse
) => {
  const { provider_key, provider_id } = req.validatedQuery

  const { result } = await getApishipTariffsWorkflow(req.scope).run({
    input: {
      provider_key,
      provider_id,
    },
  })

  res.status(200).json({
    tariffs: result,
  })
}
