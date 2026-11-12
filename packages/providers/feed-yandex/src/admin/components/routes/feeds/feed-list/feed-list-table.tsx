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

import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation("gorgo")
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
    columnHelper.accessor("title", { header: t("feedYandex.feeds.fields.title") }),
    columnHelper.accessor("file_name", {
      header: t("feedYandex.feeds.fields.fileName"),
      cell: ({ row }) => {
        return row.original.file_name + fileExtension
      },
    }),
    columnHelper.accessor("file_path", {
      header: t("feedYandex.feeds.fields.feedUrl"),
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
      header: t("feedYandex.feeds.fields.lastExport"),
      cell: ({ getValue }) => {
        const rawDate = getValue()
        return <DateCell date={rawDate} mode="relative" />
      }
    }),
    columnHelper.accessor("is_active", {
      header: t("feedYandex.feeds.fields.status"),
      cell: ({ getValue }) => {
        const isActive = getValue()
        if (isActive) {
          return (
            <div className="flex items-center gap-1"><SquareGreenSolid />
              <Text size="small" leading="compact" className="whitespace-pre-line text-pretty">
                {t("feedYandex.general.active")}
              </Text>
            </div>
          )
        } else {
          return (
            <div className="flex items-center gap-1">
              <SquareRedSolid />
              <Text size="small" leading="compact" className="whitespace-pre-line text-pretty">
                {t("feedYandex.general.inactive")}
              </Text>
            </div>
          )
        }
      }
    }),
    columnHelper.accessor("schedule", {
      header: t("feedYandex.feeds.fields.schedule"),
      cell: ({ getValue }) => {
        const value = getValue()
        return (
          <Badge size="2xsmall">
            <Text size="xsmall" leading="compact">
              {getScheduleLabel(value, t)}
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
        title={t("feedYandex.feeds.domain")}
        actions={[
          {
            type: "button",
            props: {
              children: t("feedYandex.actions.create"),
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
