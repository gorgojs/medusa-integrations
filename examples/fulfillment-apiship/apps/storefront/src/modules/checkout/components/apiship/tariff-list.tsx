"use client"

import { convertToLocale } from "@lib/util/money"
import { useLocaleDirection } from "@lib/hooks/use-locale-direction"
import { RadioGroup, Text } from "@medusajs/ui"
import { useLocale, useTranslations } from "next-intl"
import type { ApishipTariff } from "./types"
import { getTariffCost, getTariffDays } from "./utils"

type TariffGroup = {
  providerKey: string
  tariffs: ApishipTariff[]
}

type TariffListProps = {
  groups: TariffGroup[]
  currencyCode: string
  providerNames: Record<string, string>
  selectedKey: string | null
  onSelect: (key: string) => void
  /** Carrier headings only help when more than one carrier is on offer. */
  showGroupNames?: boolean
}

/**
 * The tariffs of one shipping option, grouped by carrier. Both the courier modal and the
 * map's point panel show the same list, so the two stay in step.
 */
export default function TariffList({
  groups,
  currencyCode,
  providerNames,
  selectedKey,
  onSelect,
  showGroupNames = true,
}: TariffListProps) {
  const t = useTranslations("Apiship")
  const dir = useLocaleDirection()
  const locale = useLocale()

  const formatDays = (tariff: ApishipTariff) => {
    const days = getTariffDays(tariff)
    if (!days) return null

    return days.min === days.max
      ? t("deliveryDays", { count: days.max })
      : t("deliveryDaysRange", { min: days.min, max: days.max })
  }

  return (
    <RadioGroup
      dir={dir}
      value={selectedKey ?? undefined}
      onValueChange={onSelect}
      className="flex flex-col gap-[10px]"
    >
      {groups.map((group) => (
        <div key={group.providerKey} className="flex flex-col gap-[10px]">
          {showGroupNames && (
            <Text className="txt-compact-small-plus text-ui-fg-subtle">
              {providerNames[group.providerKey] ?? group.providerKey}
            </Text>
          )}

          {group.tariffs.map((tariff) => {
            const cost = getTariffCost(tariff)
            const days = formatDays(tariff)

            return (
              <RadioGroup.ChoiceBox
                key={tariff.key}
                value={tariff.key}
                label={tariff.tariffName ?? group.providerKey}
                description={[
                  days,
                  cost === null
                    ? null
                    : convertToLocale({
                        amount: cost,
                        currency_code: currencyCode,
                        locale,
                      }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                data-testid="apiship-tariff-radio"
              />
            )
          })}
        </div>
      ))}
    </RadioGroup>
  )
}
