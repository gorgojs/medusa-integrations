"use client"

import { convertToLocale } from "@lib/util/money"
import { Text } from "@medusajs/ui"
import { useLocale, useTranslations } from "next-intl"
import type { ApishipSelection } from "./types"
import { getTariffCost, getTariffDays } from "./utils"

type ApishipSelectionSummaryProps = {
  selection: ApishipSelection
  currencyCode: string
  providerNames: Record<string, string>
  onEdit: () => void
  onRemove: () => void
  disabled?: boolean
}

/**
 * What the customer settled on, kept next to the shipping cards so the pickup point and
 * the tariff stay visible after the modal closes.
 */
export default function ApishipSelectionSummary({
  selection,
  currencyCode,
  providerNames,
  onEdit,
  onRemove,
  disabled,
}: ApishipSelectionSummaryProps) {
  const t = useTranslations("Apiship")
  const tCommon = useTranslations("Common")
  const tCheckout = useTranslations("CheckoutPage")
  const locale = useLocale()

  const cost = getTariffCost(selection.tariff)
  const days = getTariffDays(selection.tariff)
  const point = selection.point

  const details = [
    selection.tariff.tariffName ??
      providerNames[selection.tariff.providerKey] ??
      selection.tariff.providerKey,
    cost === null
      ? null
      : convertToLocale({
          amount: cost,
          currency_code: currencyCode,
          locale,
        }),
    !days
      ? null
      : days.min === days.max
        ? t("deliveryDays", { count: days.max })
        : t("deliveryDaysRange", { min: days.min, max: days.max }),
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div
      className="flex flex-col gap-y-1 rounded-md border border-ui-border-base bg-ui-bg-subtle p-3"
      data-testid="apiship-selection-summary"
    >
      <div className="flex items-start justify-between gap-x-4">
        <Text className="txt-compact-medium-plus text-ui-fg-base">
          {point ? t("pickupPointModalTitle") : t("courierModalTitle")}
        </Text>

        <div className="flex shrink-0 gap-x-3">
          <button
            type="button"
            onClick={onEdit}
            disabled={disabled}
            className="txt-compact-small-plus text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors disabled:text-ui-fg-disabled"
          >
            {tCheckout("edit")}
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="txt-compact-small-plus text-ui-fg-subtle hover:text-ui-fg-base transition-colors disabled:text-ui-fg-disabled"
          >
            {tCommon("remove")}
          </button>
        </div>
      </div>

      {point && (
        <div className="flex flex-col">
          {point.name && (
            <Text className="txt-compact-small text-ui-fg-base">
              {point.name}
            </Text>
          )}
          {point.address && (
            <Text className="txt-compact-small text-ui-fg-subtle">
              {point.address}
            </Text>
          )}
          {point.timetable && (
            <Text className="txt-compact-small text-ui-fg-muted">
              {point.timetable}
            </Text>
          )}
        </div>
      )}

      <Text className="txt-compact-small text-ui-fg-subtle">{details}</Text>
    </div>
  )
}
