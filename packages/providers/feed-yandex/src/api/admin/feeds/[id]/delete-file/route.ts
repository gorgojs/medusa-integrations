import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { deleteFeedFilesWorkflow } from "../../../../../workflows/delete-feed-files"

export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const id = req.params.id

  await deleteFeedFilesWorkflow(req.scope)
    .run({
      input: {ids: [id]},
    })

  res.status(200).json({
    id,
    object: "feed-file",
    deleted: true,
  })
}