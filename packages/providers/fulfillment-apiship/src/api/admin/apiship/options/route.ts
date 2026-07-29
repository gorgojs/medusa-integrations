import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateApishipOptionsWorkflow } from "../../../../workflows/update-apiship-options"
import { getApishipOptionsWorkflow } from "../../../../workflows/get-apiship-options"
import {
  AdminUpdateApishipOptions,
  AdminApishipOptionsResponse
} from "../../../../types/http"
import { AdminApishipProviderIdQueryType } from "../validators"

export const POST = async (
  req: MedusaRequest<AdminUpdateApishipOptions, AdminApishipProviderIdQueryType>,
  res: MedusaResponse
) => {
  const { provider_id } = req.validatedQuery

  await updateApishipOptionsWorkflow(req.scope).run({
    input: { ...req.validatedBody, provider_id },
  })
  const { result } = await getApishipOptionsWorkflow(req.scope).run({
    input: { provider_id },
  })

  res.status(200).json({
    apiship_options: result
  })
}

export const GET = async (
  req: MedusaRequest<unknown, AdminApishipProviderIdQueryType>,
  res: MedusaResponse<AdminApishipOptionsResponse>
) => {
  const { provider_id } = req.validatedQuery

  const { result } = await getApishipOptionsWorkflow(req.scope).run({
    input: { provider_id },
  })

  res.status(200).json({
    apiship_options: result
  })
}