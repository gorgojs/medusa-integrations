import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getApishipPointsWorkflow } from "../../../../workflows/get-apiship-points"
import { StoreApishipPointListResponse } from "../../../../types/http"
import { StoreGetApishipPointsType } from "../validators"

export const GET = async (
  req: MedusaRequest<unknown, StoreGetApishipPointsType>,
  res: MedusaResponse<StoreApishipPointListResponse>
) => {
  const { key, filter, fields, limit, offset } = req.validatedQuery

  const { result } = await getApishipPointsWorkflow(
    req.scope
  ).run({
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
