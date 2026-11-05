import {
  Button,
  Container,
  DropdownMenu,
  Heading,
  Text,
  Tooltip,
  DataTable,
  useDataTable,
  createDataTableColumnHelper,
  createDataTableFilterHelper,
  type DataTableFilteringState,
} from "@medusajs/ui"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"
import { sdk } from "../../../../lib/sdk"
import {
  useChangeActors,
  useChangeFields,
  useChangeTimeFormat,
  useIntegrationChanges,
} from "../../../../lib/changes"
import { usePaginationTranslations } from "../../../../lib/data-table"
import { IntegrationIcon } from "../../../../components/integration-icon"
import { ChangeActor } from "../../../../components/history/change-actor"
import { ChangeDrawer, useChangeParam } from "../../../../components/history/change-drawer"
import { changeTitle } from "../../../../components/history/change-title"
import { FieldBadges } from "../../../../components/history/field-badges"
import { useDiffLabel } from "../../../../components/history/diff-rows"
import {
  CHANGE_TYPES,
  HISTORY_PAGE_SIZE,
  SYSTEM_ACTOR,
  buildChangesQuery,
  emptyFilters,
  fieldsMatching,
  filtersFromState,
  hasFilters,
  orderFromSorting,
  readFilters,
  readOffset,
  sortingFromOrder,
  writeFilters,
  type HistoryFilters,
} from "../../../../components/history/history-filters"
import type {
  AdminIntegrationChange,
  AdminIntegrationListResponse,
  IntegrationOverviewItem,
  UiField,
} from "../../../../../types"

const columnHelper = createDataTableColumnHelper<AdminIntegrationChange>()
const filterHelper = createDataTableFilterHelper<AdminIntegrationChange>()

// The rows carry no descriptor: badges are labelled with what each change stored.
const NO_FIELDS = new Map<string, UiField>()

/**
 * "Add filter" as a labelled button: `DataTable.FilterMenu` draws only a funnel icon and takes no
 * label. `options` are the filters not in use yet; picking one adds it without a value, as the
 * table's own menu does, so its value picker opens.
 */
const AddFilterMenu = ({
  label,
  options,
  onAdd,
}: {
  label: string
  options: { id: string; label: string }[]
  onAdd: (id: string) => void
}) => (
  <DropdownMenu>
    <DropdownMenu.Trigger asChild disabled={!options.length}>
      <Button size="small" variant="secondary">
        {label}
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content side="bottom" align="start">
      {options.map((option) => (
        <DropdownMenu.Item key={option.id} onClick={() => onAdd(option.id)}>
          {option.label}
        </DropdownMenu.Item>
      ))}
    </DropdownMenu.Content>
  </DropdownMenu>
)

const HistoryPage = () => {
  const { t } = useTranslation()
  const paginationLabels = usePaginationTranslations()
  const time = useChangeTimeFormat()
  const [params, setParams] = useSearchParams()
  const { changeId, open, close } = useChangeParam()

  const filters = readFilters(params)
  const offset = readOffset(params)
  const pageIndex = Math.floor(offset / HISTORY_PAGE_SIZE)

  // The search also finds a change by the options it touched, by their labels as the rows show them.
  const labelOf = useDiffLabel(NO_FIELDS)
  const { data: changeFields } = useChangeFields()
  const qFields = fieldsMatching(filters.q, changeFields?.fields ?? [], labelOf)
  const { data, isLoading } = useIntegrationChanges(null, buildChangesQuery(filters, offset, qFields))

  // Search, sorting and filters all start again from the first page.
  const update = (patch: Partial<HistoryFilters>) =>
    setParams((prev) => writeFilters(prev, { ...readFilters(prev), ...patch }), { replace: true })
  const sorting = sortingFromOrder(filters.order)
  const changes = data?.integration_changes ?? []

  // Registered integrations: names and icons for the rows and the options of the integration filter.
  const { data: overview } = useQuery({
    queryKey: ["integration-overview", "history"],
    queryFn: () =>
      sdk.client.fetch<AdminIntegrationListResponse>("/admin/integrations", { query: { limit: 1000 } }),
    placeholderData: keepPreviousData,
  })
  const integrations = overview?.integrations
  const byProvider = useMemo(() => {
    const map = new Map<string, IntegrationOverviewItem>()
    for (const item of integrations ?? []) map.set(item.provider_id, item)
    return map
  }, [integrations])

  // Who made changes: the options of the author filter.
  const { data: actors } = useChangeActors()

  const columns = useMemo(() => {
    // The menu names the column, then the direction in words that fit its values, as Medusa's
    // own tables do. Not Medusa's date labels: they put "Newest first" on the ascending order
    // (medusajs/medusa#17228).
    const byText = { asc: t("integration.history.sort.aToZ"), desc: t("integration.history.sort.zToA") }
    const byTime = {
      asc: t("integration.history.sort.oldestFirst"),
      desc: t("integration.history.sort.newestFirst"),
    }
    const sortable = (label: string, directions = byText) => ({
      header: label,
      enableSorting: true,
      sortLabel: label,
      sortAscLabel: directions.asc,
      sortDescLabel: directions.desc,
    })
    return [
      columnHelper.accessor("created_at", {
        ...sortable(t("integration.history.columns.time"), byTime),
        cell: ({ row }) => (
          <Tooltip content={time.full(row.original.created_at)}>
            <Text size="small" leading="compact">
              {time.relative(row.original.created_at)}
            </Text>
          </Tooltip>
        ),
      }),
      columnHelper.accessor("provider_id", {
        ...sortable(t("integration.history.columns.integration")),
        cell: ({ row }) => {
          // A provider that is no longer registered has no name and no page left, only its id.
          const item = byProvider.get(row.original.provider_id)
          if (!item) {
            return (
              <Text size="small" leading="compact">
                {row.original.provider_id}
              </Text>
            )
          }
          return (
            <Link
              to={`/settings/integrations/${item.provider_id}`}
              // The row itself opens the change card; this leads to the integration instead.
              onClick={(e) => e.stopPropagation()}
              className="hover:text-ui-fg-interactive flex items-center gap-x-2"
            >
              <IntegrationIcon src={item.icon} alt={t(item.display_name)} size="xsmall" />
              <Text size="small" leading="compact">
                {t(item.display_name)}
              </Text>
            </Link>
          )
        },
      }),
      columnHelper.accessor("change_type", {
        ...sortable(t("integration.history.columns.event")),
        cell: ({ row }) => {
          const title = changeTitle(row.original)
          return (
            <Text size="small" leading="compact">
              {t(title.key, title.values)}
            </Text>
          )
        },
      }),
      columnHelper.accessor("actor_label", {
        ...sortable(t("integration.history.columns.author")),
        // The table clips a cell's content to its box, and the avatar's ring is a shadow drawn
        // outside the avatar: the padding leaves room for it.
        cell: ({ row }) => (
          <div className="p-0.5">
            <ChangeActor change={row.original} />
          </div>
        ),
      }),
      columnHelper.display({
        id: "fields",
        header: t("integration.history.columns.fields"),
        cell: ({ row }) => <FieldBadges diff={row.original.diff} fields={NO_FIELDS} className="flex-nowrap" />,
      }),
    ]
  }, [t, time, byProvider])

  const tableFilters = useMemo(
    () => [
      filterHelper.accessor("provider_id", {
        type: "select",
        label: t("integration.history.filters.integration"),
        options: (integrations ?? []).map((item) => ({ label: t(item.display_name), value: item.provider_id })),
      }),
      filterHelper.accessor("change_type", {
        type: "select",
        label: t("integration.history.filters.event"),
        options: CHANGE_TYPES.map((type) => ({ label: t(`integration.history.types.${type}`), value: type })),
      }),
      // Only who made changes, so every author finds something; a removed account included.
      filterHelper.accessor("actor_id", {
        type: "select",
        label: t("integration.history.filters.author"),
        options: [
          ...(actors?.users ?? []).map((user) => ({
            label: user.label ?? t("integration.history.actors.unknownUser"),
            value: user.id,
          })),
          ...(actors?.system ? [{ label: t("integration.history.actors.system"), value: SYSTEM_ACTOR }] : []),
        ],
      }),
      filterHelper.accessor("created_at", {
        type: "date",
        label: t("integration.history.filters.period"),
        options: [],
      }),
    ],
    [t, integrations, actors]
  )

  // A filter picked from the menu starts without a value, and the table keeps its picker open
  // only while that empty filter stays in its state. The URL holds filters with a value, so the
  // empty ones wait here until they get one or are dismissed.
  const [pendingFilters, setPendingFilters] = useState<DataTableFilteringState>({})
  const filtering: DataTableFilteringState = {
    ...(filters.provider_id.length && { provider_id: filters.provider_id }),
    ...(filters.change_type.length && { change_type: filters.change_type }),
    ...(filters.actor_id.length && { actor_id: filters.actor_id }),
    ...(filters.created_at && { created_at: filters.created_at }),
    ...pendingFilters,
  }

  const table = useDataTable({
    data: changes,
    columns,
    filters: tableFilters,
    rowCount: data?.count ?? 0,
    isLoading,
    getRowId: (row) => row.id,
    // A new filter starts from the first page; this is done below in one update to the URL.
    autoResetPageIndex: false,
    onRowClick: (_e, row) => {
      // The table hands over its Row wrapper at runtime; the change is under `.original`.
      open((row as unknown as { original: AdminIntegrationChange }).original.id)
    },
    filtering: {
      state: filtering,
      onFilteringChange: (state) => {
        setPendingFilters(emptyFilters(state) as DataTableFilteringState)
        update(filtersFromState(state))
      },
    },
    search: {
      state: filters.q,
      onSearchChange: (q) => update({ q }),
    },
    sorting: {
      state: sorting,
      // A header click that would leave the table unsorted flips the direction instead: the
      // history has no unsorted order.
      onSortingChange: (next) =>
        update({ order: orderFromSorting(next ?? { ...sorting, desc: !sorting.desc }) }),
    },
    pagination: {
      state: { pageIndex, pageSize: HISTORY_PAGE_SIZE },
      onPaginationChange: (next) =>
        setParams(
          (prev) => {
            const params = new URLSearchParams(prev)
            if (next.pageIndex > 0) params.set("offset", String(next.pageIndex * HISTORY_PAGE_SIZE))
            else params.delete("offset")
            return params
          },
          { replace: true }
        ),
    },
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-1 px-6 py-4">
        <Heading level="h2">{t("integration.history.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("integration.history.pageSubtitle")}
        </Text>
      </div>

      {/* Rows without the line between them: the table draws it as each row's bottom border. */}
      <DataTable instance={table} className="[&_td]:py-3 [&_tbody_tr]:border-b-0">
        {/* The toolbar draws the bar of active filters itself. */}
        <DataTable.Toolbar
          className="justify-between gap-x-2"
          translations={{ clearAll: t("integration.history.filters.clearAll") }}
        >
          <AddFilterMenu
            label={t("integration.history.filters.add")}
            options={tableFilters.filter((filter) => !(filter.id in filtering))}
            onAdd={(id) =>
              table.addFilter({
                id,
                // The empty value of each type, as the table's own menu sets it.
                value: tableFilters.find((filter) => filter.id === id)?.type === "select" ? [] : null,
              })
            }
          />
          <div className="flex items-center gap-x-2">
            <DataTable.Search placeholder={t("integration.history.search")} />
            <DataTable.SortingMenu tooltip={t("integration.history.sort.tooltip")} />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table
          emptyState={{
            empty: {
              heading: hasFilters(filters) ? t("integration.history.emptyFiltered") : t("integration.history.empty"),
            },
            filtered: { heading: t("integration.history.emptyFiltered") },
          }}
        />
        <DataTable.Pagination translations={paginationLabels} />
      </DataTable>

      <ChangeDrawer changeId={changeId} onClose={close} />
    </Container>
  )
}

const HistoryBreadcrumb = () => {
  const { t } = useTranslation()
  return <>{t("integration.history.title")}</>
}

export const handle = {
  breadcrumb: () => <HistoryBreadcrumb />,
}

export default HistoryPage
