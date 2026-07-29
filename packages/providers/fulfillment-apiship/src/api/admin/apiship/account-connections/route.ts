import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getApishipAccountConnectionsWorkflow } from "../../../../workflows/get-apiship-account-connections"
import { AdminApishipAccountConnectionListResponse } from "../../../../types/http/apiship"
import { AdminApishipProviderIdQueryType } from "../validators"

export const GET = async (
    req: AuthenticatedMedusaRequest<unknown, AdminApishipProviderIdQueryType>,
    res: MedusaResponse<AdminApishipAccountConnectionListResponse>
) => {
    const { provider_id } = req.validatedQuery

    const { result } = await getApishipAccountConnectionsWorkflow(req.scope).run({
      input: { provider_id },
    })

    res.status(200).json({
      account_connections: result
    })
}