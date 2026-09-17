import { Badge, Button, Text } from "@medusajs/ui"
import { XMarkMini } from "@medusajs/icons"
import { useMemo } from "react"
import type { ApishipHttpTypes } from "@gorgo/medusa-fulfillment-apiship/types"
import { Combobox } from "./combobox"

type TariffOption = { value: string; label: string }

const SelectedTariffsList = ({
  options,
  value,
  onChange,
}: {
  options: TariffOption[]
  value: string[]
  onChange: (value: string[]) => void
}) => {
  if (!value.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-y-1">
      {value.map((id) => (
        <Badge key={id} size="2xsmall" rounded="full" className="flex w-fit items-center gap-x-1">
          {options.find((option) => option.value === id)?.label ?? id}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== id))}
            className="text-ui-fg-subtle hover:text-ui-fg-base"
          >
            <XMarkMini />
          </button>
        </Badge>
      ))}
    </div>
  )
}

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
  const courierOptions = useMemo(
    () =>
      tariffs
        .filter((tariff) => tariff.deliveryType !== 2)
        .map((tariff) => ({ value: String(tariff.id), label: `${tariff.name ?? tariff.id} (id: ${tariff.id})` })),
    [tariffs]
  )
  const pointOptions = useMemo(
    () =>
      tariffs
        .filter((tariff) => tariff.deliveryType !== 1)
        .map((tariff) => ({ value: String(tariff.id), label: `${tariff.name ?? tariff.id} (id: ${tariff.id})` })),
    [tariffs]
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
      {courierOptions.length > 0 && (
        <div className="flex flex-col gap-y-2">
          <Text size="small" weight="plus" className="text-ui-fg-subtle">
            {t("apiship.connections.form.fields.allowedTariffs.courier")}
          </Text>
          <Combobox
            value={doorValue}
            onChange={(value) => onDoorChange(value ?? [])}
            options={courierOptions}
            placeholder={t("apiship.connections.fields.allTariffsAllowed")}
            hideSelectedTag
            allowClear
          />
          <SelectedTariffsList options={courierOptions} value={doorValue} onChange={onDoorChange} />
        </div>
      )}
      {pointOptions.length > 0 && (
        <div className="flex flex-col gap-y-2">
          <Text size="small" weight="plus" className="text-ui-fg-subtle">
            {t("apiship.connections.form.fields.allowedTariffs.pvz")}
          </Text>
          <Combobox
            value={pointValue}
            onChange={(value) => onPointChange(value ?? [])}
            options={pointOptions}
            placeholder={t("apiship.connections.fields.allTariffsAllowed")}
            hideSelectedTag
            allowClear
          />
          <SelectedTariffsList options={pointOptions} value={pointValue} onChange={onPointChange} />
        </div>
      )}
    </div>
  )
}
