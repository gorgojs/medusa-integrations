import { StatusBadge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"
import { LICENSE_BADGE } from "../lib/license"
import type { LicenseStateEntry } from "../../modules/integration/types"

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="text-ui-fg-subtle grid grid-cols-2 gap-x-3 px-6 py-4">
    <Text size="small" weight="plus" leading="compact">
      {label}
    </Text>
    <div className="flex flex-col gap-y-1">{children}</div>
  </div>
)

const Value = ({ children }: { children: ReactNode }) => (
  <Text size="small" leading="compact">
    {children}
  </Text>
)

const date = (iso: string) => new Date(iso).toLocaleDateString()
const dateTime = (iso: string) => new Date(iso).toLocaleString()

/**
 * What the license check knows about one package, as rows of a section. Rows the platform has not
 * answered yet are left out rather than shown empty.
 */
export const LicenseDetails = ({ entry }: { entry: LicenseStateEntry }) => {
  const { t } = useTranslation()
  const badge = LICENSE_BADGE[entry.state]
  const reason =
    entry.state === "failed"
      ? t(`integration.license.reason.${entry.reason ?? "unknown"}`, {
          defaultValue: t("integration.license.reason.unknown"),
        })
      : entry.state === "unreachable"
        ? t("integration.license.reason.unreachable")
        : null

  return (
    <>
      <Row label={t("integration.license.card.status")}>
        <div>
          <StatusBadge color={badge.color}>{t(badge.key)}</StatusBadge>
        </div>
        {reason && (
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {reason}
          </Text>
        )}
      </Row>
      {entry.project && (
        <Row label={t("integration.license.card.project")}>
          <Value>{entry.project.name}</Value>
        </Row>
      )}
      {entry.environment !== undefined && (
        <Row label={t("integration.license.card.environment")}>
          <Value>{entry.environment?.name ?? t("integration.license.card.outsideEnvironments")}</Value>
        </Row>
      )}
      {entry.subscription && (
        <Row label={t("integration.license.card.endsAt")}>
          <Value>
            {entry.subscription.ends_at ? date(entry.subscription.ends_at) : t("integration.license.card.noEnd")}
          </Value>
        </Row>
      )}
      {entry.subscription?.cutoff && (
        <Row label={t("integration.license.card.cutoff")}>
          <Value>{date(entry.subscription.cutoff)}</Value>
        </Row>
      )}
      {entry.latest_allowed_version && (
        <Row label={t("integration.license.card.latestVersion")}>
          <Value>{entry.latest_allowed_version}</Value>
        </Row>
      )}
      <Row label={t("integration.license.card.checkedAt")}>
        <Value>{entry.checked_at ? dateTime(entry.checked_at) : t("integration.license.card.never")}</Value>
      </Row>
    </>
  )
}
