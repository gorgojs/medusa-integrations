import { Container, Badge, StatusBadge } from "@medusajs/ui"
import { PencilSquare } from "@medusajs/icons"
import { useTranslation } from "react-i18next"
import { SectionRow } from "../../../../../common/section-row"
import { Header } from "../../../../../common/header"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"

type ApishipPaymentAndTaxSectionProps = {
  apishipOptions?: ApishipHttpTypes.AdminApishipOptions
  onEdit: () => void
}

const formatVat = (value?: number | null, noVatLabel?: string) => {
  if (value === undefined || value === null) {
    return "-"
  }

  if (value === -1) {
    return noVatLabel ?? "No VAT"
  }

  return `${value}%`
}

export const ApishipPaymentAndTaxSection = ({
  apishipOptions,
  onEdit,
}: ApishipPaymentAndTaxSectionProps) => {
  const { t } = useTranslation()

  const settings = apishipOptions?.settings

  return (
    <Container className="divide-y p-0">
      <Header
        title={t("apiship.paymentAndTax.title")}
        actions={[
          {
            type: "action-menu",
            props: {
              groups: [
                {
                  actions: [
                    {
                      icon: <PencilSquare />,
                      label: t("actions.edit"),
                      onClick: onEdit,
                    },
                  ],
                },
              ],
            },
          },
        ]}
      />
      <SectionRow
        title={t("apiship.paymentAndTax.fields.deliveryCostVat.label")}
        value={
          settings?.delivery_cost_vat === undefined ? (
            "-"
          ) : (
            <Badge size="2xsmall" className="block w-fit truncate">
              {formatVat(
                settings.delivery_cost_vat,
                t("apiship.paymentAndTax.values.noVat")
              )}
            </Badge>
          )
        }
      />
      <SectionRow
        title={t("apiship.paymentAndTax.fields.isCod.label")}
        value={
          settings?.is_cod === undefined ? (
            "-"
          ) : (
            <StatusBadge color={settings.is_cod ? "green" : "red"}>
              {settings.is_cod
                ? t("statuses.enabled")
                : t("statuses.disabled")}
            </StatusBadge>
          )
        }
      />
    </Container>
  )
}
