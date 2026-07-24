import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  MedusaRequest
} from "@medusajs/framework/http"
import { runFeedsWorkflow } from "../../../../../workflows/run-feeds"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await runFeedsWorkflow(req.scope)
    .run({
      input: {
        ids: [req.params.id]
      }
    })

  res.json({ feed: result })
}