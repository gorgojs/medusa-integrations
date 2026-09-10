import { Button, Checkbox, Text } from "@medusajs/ui"
import { useMemo } from "react"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"

type ApishipAllowedTariffsFieldProps = {
  tariffs: ApishipHttpTypes.AdminApishipTariff[]
  doorValue: string[]
  onDoorChange: (value: string[]) => void
  pointValue: string[]
  onPointChange: (value: string[]) => void
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  disabled?: boolean
  t: (key: string) => string
}

export const ApishipAllowedTariffsField = ({
  tariffs,
  doorValue,
  onDoorChange,
  pointValue,
  onPointChange,
  isLoading,
  isError,
  onRetry,
  disabled,
  t,
}: ApishipAllowedTariffsFieldProps) => {
  // ApiShip's own `deliveryType` is 1 (door only), 2 (point only), or unset (both) — a tariff
  // with no restriction shows up, and is toggled, independently in both groups below.
  const courierTariffs = useMemo(
    () => tariffs.filter((tariff) => tariff.deliveryType !== 2),
    [tariffs]
  )
  const pointTariffs = useMemo(
    () => tariffs.filter((tariff) => tariff.deliveryType !== 1),
    [tariffs]
  )

  const renderGroup = (
    label: string,
    group: ApishipHttpTypes.AdminApishipTariff[],
    value: string[],
    onChange: (value: string[]) => void
  ) => (
    <div className="flex flex-col gap-y-2" key={label}>
      <Text size="small" weight="plus" className="text-ui-fg-subtle">
        {label}
      </Text>
      <div className="flex max-h-[180px] flex-col gap-y-2 overflow-y-auto">
        {group.map((tariff) => {
          const id = String(tariff.id)
          return (
            <label key={id} className="flex items-center gap-x-2">
              <Checkbox
                checked={value.includes(id)}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onChange(checked ? [...value, id] : value.filter((v) => v !== id))
                }
              />
              <Text size="small">{tariff.name ?? id}</Text>
            </label>
          )
        })}
      </div>
    </div>
  )

  if (disabled) {
    return (
      <Text size="small" className="text-ui-fg-subtle">
        {t("apiship.connections.form.fields.allowedTariffs.placeholderSelectAccountConnection")}
      </Text>
    )
  }

  if (isLoading) {
    return (
      <Text size="small" className="text-ui-fg-subtle">
        {t("apiship.connections.form.fields.allowedTariffs.placeholderLoading")}
      </Text>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-x-2">
        <Text size="small" className="text-ui-fg-subtle">
          {t("apiship.tariffs.loadError")}
        </Text>
        <Button size="small" variant="secondary" type="button" onClick={onRetry}>
          {t("apiship.tariffs.retry")}
        </Button>
      </div>
    )
  }

  if (!tariffs.length) {
    return (
      <Text size="small" className="text-ui-fg-subtle">
        {t("apiship.connections.form.fields.allowedTariffs.noResults")}
      </Text>
    )
  }

  return (
    <div className="flex flex-col gap-y-4">
      {courierTariffs.length > 0 &&
        renderGroup(
          t("apiship.connections.form.fields.allowedTariffs.courier"),
          courierTariffs,
          doorValue,
          onDoorChange
        )}
      {pointTariffs.length > 0 &&
        renderGroup(
          t("apiship.connections.form.fields.allowedTariffs.pvz"),
          pointTariffs,
          pointValue,
          onPointChange
        )}
    </div>
  )
}
