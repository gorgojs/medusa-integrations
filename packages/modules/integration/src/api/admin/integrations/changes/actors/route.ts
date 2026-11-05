import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { service } from "../../_helpers"
import type { AdminIntegrationChangeActorsResponse, IntegrationChangeUser } from "../../../../../types"

/**
 * Who the change history names, for the history page's author filter: the admin users by their
 * name or email now, and whether anything else made changes, which the admin shows as System.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationChangeActorsResponse>
) => {
  const { users, system } = await service(req).listChangeActors()
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // A removed account is not found and keeps the email stored with its changes.
  const { data: current } = users.length
    ? await query.graph({
        entity: "user",
        fields: ["id", "email", "first_name", "last_name"],
        filters: { id: users.map((user) => user.id) },
      })
    : { data: [] }
  const byId = new Map(current.map((user: any) => [user.id, user]))

  const labelled: IntegrationChangeUser[] = users.map((user) => {
    const now = byId.get(user.id)
    const name = [now?.first_name, now?.last_name].filter(Boolean).join(" ")
    return { id: user.id, label: name || now?.email || user.label }
  })
  // By label, as the filter lists them; a user without one goes last.
  labelled.sort((a, b) => (a.label ?? "￿").localeCompare(b.label ?? "￿"))

  res.json({ users: labelled, system })
}
