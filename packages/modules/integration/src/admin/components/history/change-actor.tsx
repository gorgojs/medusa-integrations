import { Avatar, Text, clx } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { sdk } from "../../lib/sdk"
import type { AdminIntegrationChange } from "../../../types"

/**
 * Who made a change: an admin user, with the avatar the admin shows in its profile menu. A user is
 * looked up for their current name and falls back to the email stored with the change when the
 * account is gone. Settings are changed by people, so anything else (a script with an API key, a
 * seed, code run without a request) is shown as the system.
 */
export const ChangeActor = ({
  change,
  className,
}: {
  change: Pick<AdminIntegrationChange, "actor_type" | "actor_id" | "actor_label">
  /** Classes for the name, e.g. its color. */
  className?: string
}) => {
  const { t } = useTranslation()
  const isUser = change.actor_type === "user" && !!change.actor_id
  const { data } = useQuery({
    queryKey: ["integration-change-actor", change.actor_id],
    queryFn: () => sdk.admin.user.retrieve(change.actor_id!, { fields: "id,email,first_name,last_name" }),
    enabled: isUser,
    staleTime: 5 * 60_000,
    retry: false,
  })

  if (!isUser) {
    return (
      <Text size="small" leading="compact" className={clx("text-ui-fg-subtle", className)}>
        {t("integration.history.actors.system")}
      </Text>
    )
  }

  const user = data?.user
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ")
  const label = name || user?.email || change.actor_label || t("integration.history.actors.unknownUser")

  return (
    <div className="flex min-w-0 items-center gap-x-2">
      <Avatar size="2xsmall" fallback={label.charAt(0).toUpperCase()} />
      <Text size="small" leading="compact" className={clx("text-ui-fg-subtle truncate", className)}>
        {label}
      </Text>
    </div>
  )
}
