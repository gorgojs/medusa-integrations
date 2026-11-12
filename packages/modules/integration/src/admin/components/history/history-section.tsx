import { Button, Container, Heading, Text } from "@medusajs/ui"
import { Spinner } from "@medusajs/icons"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ChangeTimeline } from "./change-timeline"
import { useIntegrationChanges } from "../../lib/changes"
import type { AdminIntegrationChange, UiDescriptor } from "../../../types"

/** How many recent changes the integration page shows. The rest is on the history page. */
const RECENT_CHANGES = 5

/** "Change history" on an integration's page: its latest changes, how many there are, and a link to all of them. */
export const IntegrationHistorySection = ({
  providerId,
  descriptor,
  onSelect,
}: {
  providerId: string
  descriptor: UiDescriptor
  onSelect?: (change: AdminIntegrationChange) => void
}) => {
  const { t } = useTranslation("gorgo")
  const { data, isLoading } = useIntegrationChanges(providerId, { limit: RECENT_CHANGES })
  const changes = data?.integration_changes ?? []
  const total = data?.count ?? changes.length

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("integration.history.title")}</Heading>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center px-6 py-4">
          <Spinner className="text-ui-fg-subtle animate-spin" />
        </div>
      ) : changes.length ? (
        <>
          <ChangeTimeline
            changes={changes}
            descriptor={descriptor}
            hasMore={total > changes.length}
            onSelect={onSelect}
          />
          <div className="flex items-center justify-between gap-x-4 px-6 py-4">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {t("integration.history.shown", { shown: changes.length, count: total })}
            </Text>
            <Button size="small" variant="transparent" asChild>
              <Link to={`/settings/integrations/history?provider_id=${encodeURIComponent(providerId)}`}>
                {t("integration.history.viewAll")}
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <div className="px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {t("integration.history.empty")}
          </Text>
        </div>
      )}
    </Container>
  )
}
