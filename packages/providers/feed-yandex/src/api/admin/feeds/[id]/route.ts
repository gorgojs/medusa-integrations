import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateFeedsWorkflow } from "../../../../workflows/update-feeds"
import { deleteFeedsWorkflow } from "../../../../workflows/delete-feeds"
import { AdminGetFeedParamsType, AdminUpdateFeedType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetFeedParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const {
    data: [feed_data],
  } = await query.graph(
    {
      entity: "feed",
      filters: { id },
      fields: req.queryConfig?.fields || ["*"],
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ feed: feed_data })
}

export const PATCH = async (
  req: AuthenticatedMedusaRequest<AdminUpdateFeedType>,
  res: MedusaResponse
) => {
  const { result } = await updateFeedsWorkflow(req.scope).run({
    input: [req.validatedBody],
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: feeds } = await query.graph({
    entity: "feed",
    fields: ["*"],
    filters: { id: result[0].id },
  })

  res.json({ feed: feeds[0] })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const id = req.params.id

  await deleteFeedsWorkflow(req.scope).run({
    input: { ids: [id] },
  })

  res.status(200).json({
    id,
    object: "feed",
    deleted: true,
  })
}