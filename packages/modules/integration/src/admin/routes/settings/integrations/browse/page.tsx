import { Plus, Spinner } from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Button,
  StatusBadge,
  Tabs,
  Input,
  FocusModal,
  Copy,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { sdk } from "../../../../lib/sdk"
import { IntegrationIcon } from "../../../../components/integration-icon"
import type { AdminIntegrationCatalogResponse, CatalogItem } from "../../../../../types"

const PUBLISH_URL = "https://docs.gorgojs.com/integrations"

const InstallModal = ({ item, onOpenChange }: { item: CatalogItem | null; onOpenChange: (open: boolean) => void }) => {
  const { t } = useTranslation()
  return (
    <FocusModal open={!!item} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header />
        <FocusModal.Body className="flex flex-col items-center overflow-y-auto py-8">
          {item && (
            <div className="flex w-full max-w-lg flex-col gap-y-4">
              <div className="flex items-center gap-x-3">
                <IntegrationIcon src={item.icon} alt={item.label} />
                <Heading>{item.label}</Heading>
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                {t("integration.browse.install_addToConfig")}
              </Text>
              <div className="bg-ui-bg-subtle flex items-center justify-between gap-x-2 rounded-md px-3 py-2">
                <code className="txt-compact-small text-ui-fg-subtle">{`npm i ${item.npm}`}</code>
                <Copy content={`npm i ${item.npm}`} />
              </div>
              {item.configSnippet && (
                <div className="bg-ui-bg-subtle flex flex-col gap-y-2 rounded-md px-3 py-2">
                  <div className="flex items-center justify-between gap-x-2">
                    <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
                      medusa-config.ts
                    </Text>
                    <Copy content={item.configSnippet} />
                  </div>
                  <pre className="txt-compact-small text-ui-fg-subtle overflow-x-auto whitespace-pre">
                    {item.configSnippet}
                  </pre>
                </div>
              )}
              <a href={item.docsUrl} target="_blank" rel="noreferrer" className="text-ui-fg-interactive txt-small">
                {t("integration.browse.install_docs")} →
              </a>
            </div>
          )}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

const BrowsePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [installItem, setInstallItem] = useState<CatalogItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["integration-catalog"],
    queryFn: () => sdk.client.fetch<AdminIntegrationCatalogResponse>("/admin/integrations/catalog"),
  })

  const items = data?.integrations ?? []
  const categories = useMemo(() => [...new Set(items.map((i) => i.category))], [items])

  const q = search.trim().toLowerCase()
  const filtered = items.filter((i) => {
    if (activeTab !== "all" && i.category !== activeTab) return false
    if (q && ![i.label, i.shortDescription, i.npm].some((s) => s.toLowerCase().includes(q))) return false
    return true
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between px-6 py-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">{t("integration.browse.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("integration.browse.subtitle")}
          </Text>
        </div>
        <Button size="small" variant="primary" asChild>
          <a href={PUBLISH_URL} target="_blank" rel="noreferrer">
            <Plus />
            {t("integration.browse.publish")}
          </a>
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Trigger value="all">{t("integration.list.tabs.all")}</Tabs.Trigger>
            {categories.map((c) => (
              <Tabs.Trigger key={c} value={c}>
                {t(`integration.categories.${c}`)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
        <div className="w-64">
          <Input
            placeholder={t("integration.browse.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="text-ui-fg-subtle animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            {t("integration.list.emptyFiltered")}
          </Text>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filtered.map((item) => (
              <div key={item.integrationId} className="shadow-borders-base flex flex-col rounded-lg">
                <div className="flex flex-1 flex-col gap-y-3 p-4">
                  <div className="flex items-start justify-between gap-x-2">
                    <div className="flex items-center gap-x-3">
                      <IntegrationIcon src={item.icon} alt={item.label} />
                      <div className="flex flex-col">
                        <Text size="small" weight="plus" leading="compact">
                          {item.label}
                        </Text>
                        <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
                          {t("integration.browse.by", { author: item.authorLocalized })}
                        </Text>
                      </div>
                    </div>
                    <StatusBadge color={item.installed ? "green" : "grey"}>
                      {item.installed ? t("integration.browse.installed") : t("integration.browse.notInstalled")}
                    </StatusBadge>
                  </div>
                  <Text size="small" className="text-ui-fg-subtle line-clamp-2">
                    {item.shortDescription}
                  </Text>
                </div>
                <div className="flex items-center justify-between border-t px-4 py-3">
                  {item.installed && item.provider_id ? (
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => navigate(`/settings/integrations/${item.provider_id}`)}
                    >
                      {t("integration.browse.settings")}
                    </Button>
                  ) : (
                    <Button size="small" variant="primary" onClick={() => setInstallItem(item)}>
                      {t("integration.browse.install")}
                    </Button>
                  )}
                  <Text size="small" className="text-ui-fg-subtle">
                    {t(`integration.categories.${item.category}`)}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center px-6 py-4">
        <a href={PUBLISH_URL} target="_blank" rel="noreferrer" className="text-ui-fg-interactive txt-small">
          {t("integration.browse.learnMore")} →
        </a>
      </div>

      <InstallModal item={installItem} onOpenChange={(open) => !open && setInstallItem(null)} />
    </Container>
  )
}

const BrowseBreadcrumb = () => {
  const { t } = useTranslation()
  return <>{t("integration.browse.title")}</>
}

export const handle = {
  breadcrumb: () => <BrowseBreadcrumb />,
}

export default BrowsePage
