import {
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  useDataTable,
  Text,
  Badge
} from "@medusajs/ui"
import { SquareGreenSolid, SquareRedSolid } from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { i18n } from "../../../../components/utilities/i18n"
import { sdk } from "../../../../lib/sdk"
import { Header } from "../../../common/header"
import { DateCell } from "../../../common/table/date-cell"
import { PlaceholderCell } from "../../../common/table/placeholder-cell"
import { fileExtension } from "../../../../lib/constants"
import type { Feed, FeedsResponse } from "../../../../types"
import { getScheduleLabel } from "../../../../lib/utils"

const PAGE_SIZE = 20

export const FeedListTable = ({
  stateModal,
  openModal
}: {
  stateModal: boolean,
  openModal: () => void
}) => {
  const columnHelper = createDataTableColumnHelper<Feed>()

  const navigate = useNavigate()
  const limit = PAGE_SIZE
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  })

  const offset = useMemo(() => pagination.pageIndex * limit, [pagination])

  const { data, isLoading } = useQuery<FeedsResponse>({
    queryFn: () =>
      sdk.client.fetch(`/admin/feeds`, {
        query: { limit, offset },
      }),
    queryKey: [["feeds"]],
  })

  const columns = [
    columnHelper.accessor("title", { header: i18n.t("feeds.fields.title") }),
    columnHelper.accessor("file_name", {
      header: i18n.t("feeds.fields.fileName"),
      cell: ({ row }) => {
        return row.original.file_name + fileExtension
      },
    }),
    columnHelper.accessor("file_path", {
      header: i18n.t("feeds.fields.feedUrl"),
      cell: ({ row }) => {
        const filePath = row.original.file_path
        const id = row.original.id
        const fileName = row.original.file_name

        if (!filePath || !id || !fileName) {
          return <PlaceholderCell />
        }

        try {
          const fullLink = `${window.location.origin}/feeds/${id}/${fileName}${fileExtension}`
          return (
            <a href={fullLink} target="_blank" rel="noopener noreferrer">
              <Badge size="xsmall">
                <Text size="small" className="text-ui-fg-interactive">
                  {fullLink}
                </Text>
              </Badge>
            </a>
          )
        } catch {
          return <PlaceholderCell />
        }
      },
    }),
    columnHelper.accessor("last_export_at", {
      header: i18n.t("feeds.fields.lastExport"),
      cell: ({ getValue }) => {
        const rawDate = getValue()
        return <DateCell date={rawDate} mode="relative" />
      }
    }),
    columnHelper.accessor("is_active", {
      header: i18n.t("feeds.fields.status"),
      cell: ({ getValue }) => {
        const isActive = getValue()
        if (isActive) {
          return (
            <div className="flex items-center gap-1"><SquareGreenSolid />
              <Text size="small" leading="compact" className="whitespace-pre-line text-pretty">
                {i18n.t("general.active")}
              </Text>
            </div>
          )
        } else {
          return (
            <div className="flex items-center gap-1">
              <SquareRedSolid />
              <Text size="small" leading="compact" className="whitespace-pre-line text-pretty">
                {i18n.t("general.inactive")}
              </Text>
            </div>
          )
        }
      }
    }),
    columnHelper.accessor("schedule", {
      header: i18n.t("feeds.fields.schedule"),
      cell: ({ getValue }) => {
        const value = getValue()
        return (
          <Badge size="2xsmall">
            <Text size="xsmall" leading="compact">
              {getScheduleLabel(value)}
            </Text>
          </Badge>)
      },
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.feeds || [],
    getRowId: (row) => row.id,
    rowCount: data?.count || 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    onRowClick(_, row) {
      navigate(`${row.id}`)
    },
  })

  return (
    <DataTable instance={table}>
      <Header
        key={stateModal ? "create-open" : "create-closed"}
        title={i18n.t("feeds.domain")}
        actions={[
          {
            type: "button",
            props: {
              children: i18n.t("actions.create"),
              variant: "secondary",
              onClick: () => openModal(),
            },
          },
        ]}
      />
      <DataTable.Table />
      <DataTable.Pagination />
    </DataTable>
  )
}
