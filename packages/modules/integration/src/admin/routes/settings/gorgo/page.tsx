import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowUpRightOnBox, Key, Spinner } from "@medusajs/icons"
import { Alert, Button, Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { LicenseDetails } from "../../../components/license-details"
import { GORGO_ACCOUNT_URL, useLicenseStatus, useRecheckLicense } from "../../../lib/license"

/**
 * Every licensed Gorgo package of this backend process, including the ones that register their own
 * check and so never show up among the integrations. Read-only: the key lives in the environment.
 */
const GorgoPage = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useLicenseStatus()
  const recheck = useRecheckLicense()
  const packages = data?.packages ?? []
  const keyMissing = packages.some((entry) => entry.reason === "missing")

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-start justify-between gap-x-4 px-6 py-4">
          <div className="flex flex-col gap-y-1">
            <Heading level="h1">{t("integration.license.page.title")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("integration.license.page.description")}
            </Text>
          </div>
          <div className="flex shrink-0 items-center gap-x-2">
            <Button size="small" variant="secondary" asChild>
              <a href={GORGO_ACCOUNT_URL} target="_blank" rel="noopener noreferrer">
                {t("integration.license.card.openAccount")}
                <ArrowUpRightOnBox />
              </a>
            </Button>
            {packages.length > 0 && (
              <Button
                size="small"
                variant="secondary"
                isLoading={recheck.isPending}
                disabled={recheck.isPending}
                onClick={() => recheck.mutate()}
              >
                {t("integration.license.card.recheck")}
              </Button>
            )}
          </div>
        </div>
        {keyMissing && (
          <div className="px-6 py-4">
            <Alert variant="warning">{t("integration.license.page.missingKey")}</Alert>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Spinner className="text-ui-fg-subtle animate-spin" />
          </div>
        ) : packages.length === 0 ? (
          <div className="px-6 py-4">
            <Text size="small" leading="compact" className="text-ui-fg-subtle">
              {t("integration.license.page.empty")}
            </Text>
          </div>
        ) : null}
      </Container>

      {packages.map((entry) => (
        <Container key={entry.package} className="divide-y p-0">
          <div className="px-6 py-4">
            <Heading level="h2">{entry.package}</Heading>
          </div>
          <LicenseDetails entry={entry} />
        </Container>
      ))}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "integration.license.page.title",
  translationNs: "translation",
  icon: Key,
})

const GorgoBreadcrumb = () => {
  const { t } = useTranslation()
  return <>{t("integration.license.page.title")}</>
}

export const handle = {
  breadcrumb: () => <GorgoBreadcrumb />,
}

export default GorgoPage
