import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateApishipOptionsWorkflow } from "../../../../workflows/update-apiship-options"
import { getApishipOptionsWorkflow } from "../../../../workflows/get-apiship-options"
import {
  AdminUpdateApishipOptions,
  AdminApishipOptionsResponse
} from "../../../../types/http"

export const POST = async (
  req: MedusaRequest<AdminUpdateApishipOptions>,
  res: MedusaResponse
) => {
  await updateApishipOptionsWorkflow(req.scope).run({
    input: req.validatedBody,
  })
  const { result } = await getApishipOptionsWorkflow(req.scope).run()

  res.status(200).json({
    apiship_options: result
  })
}

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse<AdminApishipOptionsResponse>
) => {
  const { result } = await getApishipOptionsWorkflow(req.scope).run()

  res.status(200).json({
    apiship_options: result
  })
}