import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CogSixTooth, Plus, Trash } from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  StatusBadge,
  Tabs,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  toast,
  usePrompt,
  type DataTableAction,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { sdk } from "../../../lib/sdk"
import { IntegrationIcon } from "../../../components/integration-icon"
import type { AdminIntegrationListResponse, IntegrationOverviewItem } from "../../../../types"

const PAGE_SIZE = 20

/** Integration column: icon + name + instance badge, with a "v{version} • By {author}" meta line. */
const IntegrationCell = ({ item }: { item: IntegrationOverviewItem }) => {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <IntegrationIcon src={item.icon} alt={t(item.display_name)} size="base" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Text size="small" leading="compact" weight="plus">
            {t(item.display_name)}
          </Text>
          {item.instance_id && (
            <Badge size="2xsmall" color="grey">
              {item.instance_id}
            </Badge>
          )}
        </div>
        {item.version && (
          <Text size="xsmall" leading="compact" className="text-ui-fg-subtle">
            {t("integration.meta.version", { version: item.version })}
            {item.author &&
              (item.author_url ? (
                <>
                  {" • "}
                  <a
                    href={item.author_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ui-fg-interactive"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("integration.meta.author", { author: item.author })}
                  </a>
                </>
              ) : (
                <>{" • " + t("integration.meta.author", { author: item.author })}</>
              ))}
          </Text>
        )}
      </div>
    </div>
  )
}

/** Status column: lifecycle badge, plus a connection badge when the provider supports testing. */
const StatusCell = ({ item }: { item: IntegrationOverviewItem }) => {
  const { t } = useTranslation()

  const lifecycle = !item.is_configured
    ? { color: "grey" as const, label: t("integration.status.notConfigured") }
    : !item.is_complete
      ? { color: "orange" as const, label: t("integration.status.incomplete") }
      : item.is_enabled
        ? { color: "green" as const, label: t("integration.status.enabled") }
        : { color: "grey" as const, label: t("integration.status.disabled") }

  const connection = item.has_test_connection
    ? item.last_test_status === "passed"
      ? { color: "green" as const, label: t("integration.status.connected") }
      : item.last_test_status === "failed"
        ? { color: "red" as const, label: t("integration.status.connectionFailed") }
        : { color: "grey" as const, label: t("integration.status.notTested") }
    : null

  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge color={lifecycle.color}>{lifecycle.label}</StatusBadge>
      {connection && <StatusBadge color={connection.color}>{connection.label}</StatusBadge>}
    </div>
  )
}

const columnHelper = createDataTableColumnHelper<IntegrationOverviewItem>()

const IntegrationsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const prompt = usePrompt()

  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })

  const category = activeTab === "all" ? undefined : activeTab
  const queryParams = {
    q: search || undefined,
    category,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
  }

  const { data, isLoading } = useQuery({
    queryKey: ["integration-overview", queryParams],
    queryFn: () =>
      sdk.client.fetch<AdminIntegrationListResponse>("/admin/integrations", { query: queryParams }),
    placeholderData: keepPreviousData,
  })

  const integrations = data?.integrations ?? []
  const count = data?.count ?? 0
  const categories = data?.categories ?? []
  const docsUrl = data?.docs_url ?? "#"

  const invalidate = () => qc.invalidateQueries({ queryKey: ["integration-overview"] })

  const toggleEnabled = useMutation({
    mutationFn: ({ providerId, next }: { providerId: string; next: boolean }) =>
      sdk.client.fetch(`/admin/integrations/${providerId}/enable`, {
        method: "POST",
        body: { is_enabled: next },
      }),
    onSuccess: (_d, { next }) => {
      toast.success(next ? t("integration.toast.enabled") : t("integration.toast.disabled"))
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message ?? t("integration.toast.updateFailed")),
  })

  const test = useMutation({
    mutationFn: (providerId: string) =>
      sdk.client.fetch<{ status: string; message?: string }>(
        `/admin/integrations/${providerId}/test-connection`,
        { method: "POST" }
      ),
    onSuccess: (r) => {
      r.status === "passed"
        ? toast.success(t("integration.toast.connectionOk"))
        : toast.warning(r.message ?? r.status)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message ?? t("integration.toast.testFailed")),
  })

  const remove = useMutation({
    mutationFn: (providerId: string) =>
      sdk.client.fetch(`/admin/integrations/${providerId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success(t("integration.toast.deleted"))
      invalidate()
    },
    onError: (e: any) => toast.error(e?.message ?? t("integration.toast.deleteFailed")),
  })

  const onDelete = async (item: IntegrationOverviewItem) => {
    const confirmed = await prompt({
      title: t("integration.delete.title"),
      description: t("integration.delete.description", { name: t(item.display_name) }),
      confirmText: t("integration.actions.delete"),
      cancelText: t("integration.actions.cancel"),
    })
    if (confirmed) remove.mutate(item.provider_id)
  }

  const buildActions = (
    item: IntegrationOverviewItem
  ): DataTableAction<IntegrationOverviewItem>[][] => {
    const groups: DataTableAction<IntegrationOverviewItem>[][] = []
    const primary: DataTableAction<IntegrationOverviewItem>[] = []

    if (item.is_configured) {
      primary.push({
        label: item.is_enabled ? t("integration.actions.disable") : t("integration.actions.enable"),
        onClick: () => toggleEnabled.mutate({ providerId: item.provider_id, next: !item.is_enabled }),
      })
    }
    if (item.is_configured && item.has_test_connection && item.is_complete) {
      primary.push({
        label: t("integration.actions.test"),
        onClick: () => test.mutate(item.provider_id),
      })
    }
    if (primary.length) groups.push(primary)

    if (item.is_configured) {
      groups.push([
        {
          label: t("integration.actions.delete"),
          icon: <Trash />,
          onClick: () => onDelete(item),
        },
      ])
    }
    // Return null (not []) when there's nothing to do
    return (groups.length > 0 ? groups : null) as DataTableAction<IntegrationOverviewItem>[][]
  }

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "integration",
        header: t("integration.columns.integration"),
        cell: ({ row }) => <IntegrationCell item={row.original} />,
      }),
      columnHelper.display({
        id: "description",
        header: t("integration.columns.description"),
        cell: ({ row }) =>
          row.original.description ? (
            <Text size="small" leading="compact" className="text-ui-fg-subtle line-clamp-2">
              {t(row.original.description)}
            </Text>
          ) : null,
      }),
      columnHelper.display({
        id: "module",
        header: t("integration.columns.module"),
        cell: ({ row }) => (
          <Badge size="2xsmall" color="grey">
            {t(`integration.categories.${row.original.category}`)}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: t("integration.columns.status"),
        cell: ({ row }) => <StatusCell item={row.original} />,
      }),
      columnHelper.action({
        actions: (ctx) => buildActions(ctx.row.original),
      }),
    ],
    // Safe to memo on [t] only: react-query keeps each mutation's `mutate` ref stable across
    // renders (options updated internally), so the closed-over buildActions/mutations stay current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  )

  const table = useDataTable({
    data: integrations,
    columns,
    rowCount: count,
    isLoading,
    getRowId: (row) => row.provider_id,
    onRowClick: (_e, row) => {
      // @medusajs/ui types `row` as TData but passes the tanstack Row<TData> wrapper at
      // runtime — the item lives under `.original`. Cast to read it (the lib .d.ts is wrong).
      const item = (row as unknown as { original: IntegrationOverviewItem }).original
      navigate(`/settings/integrations/${item.provider_id}`)
    },
    search: { state: search, onSearchChange: setSearch },
    pagination: { state: pagination, onPaginationChange: setPagination },
  })

  const isFiltered = activeTab !== "all" || search.trim().length > 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between px-6 py-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">{t("integration.list.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("integration.list.subtitle")}
          </Text>
        </div>
        <Button size="small" variant="primary" asChild>
          <a href={docsUrl} target="_blank" rel="noreferrer">
            <Plus />
            {t("integration.list.addIntegration")}
          </a>
        </Button>
      </div>

      <DataTable instance={table} className="[&_td]:py-3">
        <DataTable.Toolbar>
          <div className="flex w-full items-center justify-between gap-3">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v)
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
            >
              <Tabs.List>
                <Tabs.Trigger value="all">{t("integration.list.tabs.all")}</Tabs.Trigger>
                {categories.map((c) => (
                  <Tabs.Trigger key={c} value={c}>
                    {t(`integration.categories.${c}`)}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs>
            <DataTable.Search placeholder={t("integration.list.searchPlaceholder")} />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table
          emptyState={{
            empty: { heading: isFiltered ? t("integration.list.emptyFiltered") : t("integration.list.empty") },
            filtered: { heading: t("integration.list.emptyFiltered") },
          }}
        />
        <DataTable.Pagination />
      </DataTable>

      <div className="flex items-center justify-center px-6 py-4">
        <a href={docsUrl} target="_blank" rel="noreferrer" className="text-ui-fg-interactive txt-small">
          {t("integration.list.learnMore")} →
        </a>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "integration.list.title",
  translationNs: "translation",
  icon: CogSixTooth,
})

const IntegrationsBreadcrumb = () => {
  const { t } = useTranslation()
  return <>{t("integration.list.title")}</>
}

export const handle = {
  breadcrumb: () => <IntegrationsBreadcrumb />,
}

export default IntegrationsPage
