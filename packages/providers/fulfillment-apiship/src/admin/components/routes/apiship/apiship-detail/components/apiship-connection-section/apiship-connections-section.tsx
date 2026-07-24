import {
  Container,
  DataTable,
  type DataTablePaginationState,
  DataTableRowSelectionState,
  createDataTableCommandHelper,
  toast,
  useDataTable,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { useApishipConnectionsTableColumns } from "./use-apiship-connections-table-columns"
import { Header } from "../../../../../common/header"

type ApishipConnectionsSectionProps = {
  apishipOptions?: ApishipHttpTypes.AdminApishipOptions
  onCreate: () => void
  providers: ApishipHttpTypes.AdminApishipProvider[]
}

const commandHelper = createDataTableCommandHelper()
const PAGE_SIZE = 10

export const ApishipConnectionsSection = ({
  apishipOptions,
  onCreate,
  providers,
}: ApishipConnectionsSectionProps) => {
  const { t } = useTranslation()

  const [rowSelection, setRowSelection] =
    useState<DataTableRowSelectionState>({})
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: PAGE_SIZE,
    pageIndex: 0,
  })

  const apishipConnections: ApishipHttpTypes.AdminApishipConnection[] = useMemo(() => {
    return (apishipOptions?.settings?.connections ?? []).map((connection) => ({
      id: connection?.id ?? "",
      name: connection?.name ?? "",
      provider_key: connection?.provider_key ?? "",
      provider_connect_id: connection?.provider_connect_id ?? "",
      point_in_id: connection?.point_in_id ?? "",
      point_in_address: connection?.point_in_address ?? "",
      is_enabled: Boolean(connection?.is_enabled),
    }))
  }, [apishipOptions])

  const paginatedConnections = useMemo(() => {
    return apishipConnections.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
    )
  }, [apishipConnections, pagination])

  const columns = useApishipConnectionsTableColumns(providers)

  const commands = useMemo(() => {
    return [
      commandHelper.command({
        label: t("actions.delete"),
        shortcut: "D",
        action: async (selection) => {
          const ids = Object.keys(selection)
          toast.info(`Selected for deletion: ${ids.join(", ")}`)
        },
      }),
    ]
  }, [t])

  const table = useDataTable({
    data: paginatedConnections,
    columns,
    getRowId: (row) => row.id,
    rowCount: apishipConnections.length,
    isLoading: false,
    commands,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    rowSelection: {
      state: rowSelection,
      onRowSelectionChange: setRowSelection,
    },
  })

  return (
    <Container className="overflow-hidden p-0">
      <Header
        title={t("apiship.connections.title")}
        subtitle={t("apiship.connections.subtitle")}
        actions={[
          {
            type: "button",
            props: {
              children: t("actions.add"),
              variant: "secondary",
              onClick: onCreate,
            },
          },
        ]}
      />
      <DataTable instance={table}>
        <DataTable.Table
          emptyState={{
            empty: {
              heading: t("apiship.connections.list.empty.heading"),
              description: t("apiship.connections.list.empty.description"),
            },
            filtered: {
              heading: t("apiship.connections.list.filtered.heading"),
              description: t("apiship.connections.list.filtered.description"),
            },
          }}
        />
        <DataTable.CommandBar
          selectedLabel={(count) => `${count} ${t("general.selected").toLowerCase()}`}
        />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  )
}
