import { Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { IntegrationFieldValue } from "../integration-form/field-value"
import type { DiffEntry, UiField } from "../../../types"

const Dash = () => (
  <Text size="small" leading="compact" className="text-ui-fg-subtle">
    -
  </Text>
)

/** Whether a stored value still fits the option as the current descriptor declares it. */
function fitsField(field: UiField, value: unknown): boolean {
  if (value == null) return true
  switch (field.control) {
    case "switch":
      return typeof value === "boolean"
    case "select":
      return (field.options ?? []).some((o) => String(o) === String(value))
    case "json":
      return true
    default:
      return typeof value === "string" || typeof value === "number"
  }
}

/** A value as it was stored, for an option the descriptor no longer declares the same way. */
const RawValue = ({ value }: { value: unknown }) => {
  if (value == null || value === "") return <Dash />
  return (
    <Text size="small" leading="compact" className="break-all">
      {typeof value === "string" ? value : JSON.stringify(value)}
    </Text>
  )
}

export const DiffValue = ({ field, value }: { field?: UiField; value: unknown }) =>
  field && !field.secret && fitsField(field, value) ? (
    <IntegrationFieldValue field={field} value={value} />
  ) : (
    <RawValue value={value} />
  )

/**
 * The label of a changed option: from the current descriptor, else the label key the change
 * stored if it still translates, else the option id.
 */
export function useDiffLabel(fields: Map<string, UiField>) {
  const { t, i18n } = useTranslation()
  return (entry: DiffEntry): string => {
    if (entry.field === "@title") return t("integration.history.fields.title")
    const current = fields.get(entry.field)
    if (current) return t(current.label)
    if (entry.label && i18n.exists(entry.label)) return t(entry.label)
    return entry.field
  }
}
