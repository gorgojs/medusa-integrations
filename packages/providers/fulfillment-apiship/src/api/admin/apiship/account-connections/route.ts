import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getApishipAccountConnectionsWorkflow } from "../../../../workflows/get-apiship-account-connections"
import { AdminApishipAccountConnectionListResponse } from "../../../../types/http/apiship"

export const GET = async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse<AdminApishipAccountConnectionListResponse>
) => {
    const { result } = await getApishipAccountConnectionsWorkflow(req.scope).run()

    res.status(200).json({
      account_connections: result
    })
}