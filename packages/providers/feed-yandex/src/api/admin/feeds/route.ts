import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createFeedsWorkflow } from "../../../workflows/create-feeds"
import { AdminCreateFeedType } from "./validators"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: feeds,
    metadata: { count, take, skip } = {},
  } = await query.graph({
    entity: "feed",
    ...req.queryConfig,
  })

  res.status(200).json({
    feeds,
    count,
    limit: take,
    offset: skip,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminCreateFeedType>,
  res: MedusaResponse
) => {
  const { result } = await createFeedsWorkflow(req.scope).run({
    input: req.validatedBody.feeds,
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: feeds } = await query.graph({
    entity: "feed",
    fields: ["*"],
    filters: { id: result[0].id },
  })

  res.status(200).json({ feed: feeds[0] })
}
