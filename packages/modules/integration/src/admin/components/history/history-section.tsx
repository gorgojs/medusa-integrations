import { Container, Heading, Text } from "@medusajs/ui"
import { Spinner } from "@medusajs/icons"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ChangeTimeline } from "./change-timeline"
import { useIntegrationChanges } from "../../lib/changes"
import type { AdminIntegrationChange, UiDescriptor } from "../../../types"

/** How many recent changes the integration page shows. The rest is on the history page. */
const RECENT_CHANGES = 5

/** "Change history" on an integration's page: its latest changes and a link to all of them. */
export const IntegrationHistorySection = ({
  providerId,
  descriptor,
  onSelect,
}: {
  providerId: string
  descriptor: UiDescriptor
  onSelect?: (change: AdminIntegrationChange) => void
}) => {
  const { t } = useTranslation()
  const { data, isLoading } = useIntegrationChanges(providerId, { limit: RECENT_CHANGES })
  const changes = data?.integration_changes ?? []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("integration.history.title")}</Heading>
        {changes.length > 0 && (
          <Link
            to={`/settings/integrations/history?provider_id=${encodeURIComponent(providerId)}`}
            className="text-ui-fg-interactive txt-compact-small"
          >
            {t("integration.history.viewAll")}
          </Link>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center px-6 py-4">
          <Spinner className="text-ui-fg-subtle animate-spin" />
        </div>
      ) : changes.length ? (
        <ChangeTimeline changes={changes} descriptor={descriptor} onSelect={onSelect} />
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
