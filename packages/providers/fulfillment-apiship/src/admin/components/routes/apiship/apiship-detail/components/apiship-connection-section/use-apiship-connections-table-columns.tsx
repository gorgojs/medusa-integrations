import { Tooltip, createDataTableColumnHelper } from "@medusajs/ui"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { DataTableStatusCell } from "../../../../../common/data-table-status-cell"
import { ApishipConnectionActions } from "./apiship-connection-actions"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"

const columnHelper =
  createDataTableColumnHelper<ApishipHttpTypes.AdminApishipConnection>()

export const useApishipConnectionsTableColumns = (
  providers: ApishipHttpTypes.AdminApishipProvider[]
) => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.accessor("provider_key", {
        header: t("apiship.connections.fields.deliveryService"),
        cell: ({ getValue }) => {
          const value = getValue()
          const providerName =
            providers.find((provider) => provider.key === value)?.name ?? value

          return (
            <span className="text-ui-fg-subtle text-small truncate">
              {providerName || "-"}
            </span>
          )
        },
      }),
      columnHelper.accessor("name", {
        header: t("fields.name"),
        cell: ({ getValue }) => {
          const value = getValue()

          return (
            <span className="text-ui-fg-subtle text-small truncate">
              {value || "-"}
            </span>
          )
        },
      }),
      columnHelper.accessor("point_in_address", {
        header: t("apiship.connections.fields.pickupPoint"),
        cell: ({ row }) => {
          const address = row.original.point_in_address
          const pointId = row.original.point_in_id

          const value = address
            ? `${address} (ID: ${pointId || "-"})`
            : "-"

          if (value === "-") {
            return (
              <span className="text-ui-fg-subtle text-small block max-w-[400px] truncate overflow-hidden text-ellipsis">
                {value}
              </span>
            )
          }

          return (
            <Tooltip content={value}>
              <span className="text-ui-fg-subtle text-small block max-w-[400px] truncate overflow-hidden text-ellipsis">
                {value}
              </span>
            </Tooltip>
          )
        },
      }),
      columnHelper.accessor("is_enabled", {
        header: t("fields.status"),
        cell: ({ getValue }) => {
          const isEnabled = getValue()

          return (
            <DataTableStatusCell color={isEnabled ? "green" : "grey"}>
              {isEnabled
                ? t("statuses.enabled")
                : t("statuses.disabled")}
            </DataTableStatusCell>
          )
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <div className="w-full text-right" />,
        cell: ({ row }) => {
          return (
            <div className="flex w-full min-w-[40px] justify-end">
              <ApishipConnectionActions apishipConnection={row.original} />
            </div>
          )
        },
        size: 48,
      }),
    ],
    [providers, t]
  )
}
