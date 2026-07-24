import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getApishipPointsWorkflow } from "../../../../workflows/get-apiship-points"
import { AdminGetApishipPointsParamsType } from "../validators"

export const GET = async (
  req: MedusaRequest<unknown, AdminGetApishipPointsParamsType>,
  res: MedusaResponse
) => {
  const { key, filter, fields, limit, offset } = req.validatedQuery

  const { result } = await getApishipPointsWorkflow(req.scope).run({
    input: {
      key,
      filter,
      fields,
      limit,
      offset,
    },
  })

  res.status(200).json({
    points: result,
  })
}
