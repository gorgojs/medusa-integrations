import { Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { sdk } from "../../lib/sdk"
import type { AdminIntegrationChange } from "../../../types"

/**
 * Who made a change. A user is looked up for their current name, and falls back to the email
 * stored with the change when the account is gone. An API key, a job and the system are named
 * from what the change stored.
 */
export const ChangeActor = ({ change }: { change: Pick<AdminIntegrationChange, "actor_type" | "actor_id" | "actor_label"> }) => {
  const { t } = useTranslation()
  const isUser = change.actor_type === "user" && !!change.actor_id
  const { data } = useQuery({
    queryKey: ["integration-change-actor", change.actor_id],
    queryFn: () => sdk.admin.user.retrieve(change.actor_id!, { fields: "id,email,first_name,last_name" }),
    enabled: isUser,
    staleTime: 5 * 60_000,
    retry: false,
  })

  let label: string
  if (isUser) {
    const user = data?.user
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ")
    label = name || user?.email || change.actor_label || t("integration.history.actors.unknownUser")
  } else if (change.actor_type === "api-key") {
    label = t("integration.history.actors.apiKey", { name: change.actor_label ?? change.actor_id ?? "" })
  } else if (change.actor_type === "job") {
    label = t("integration.history.actors.job")
  } else {
    label = t("integration.history.actors.system")
  }

  return (
    <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
      {label}
    </Text>
  )
}
