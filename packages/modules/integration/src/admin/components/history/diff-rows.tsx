import { Text } from "@medusajs/ui"
import { ArrowRightMini } from "@medusajs/icons"
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

const DiffValue = ({ field, value }: { field?: UiField; value: unknown }) =>
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

/** One line per changed option: "label: before → after", or what happened to a secret. */
export const DiffRows = ({
  diff,
  fields,
  limit,
}: {
  diff: DiffEntry[]
  /** The current descriptor's fields by option id. Empty when the provider is gone. */
  fields: Map<string, UiField>
  /** Show at most this many and say how many more there are. */
  limit?: number
}) => {
  const { t } = useTranslation()
  const labelOf = useDiffLabel(fields)
  const shown = limit ? diff.slice(0, limit) : diff
  const rest = diff.length - shown.length

  return (
    <div className="flex flex-col gap-y-1">
      {shown.map((entry) => (
        <div key={entry.field} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {labelOf(entry)}
          </Text>
          {"secret" in entry ? (
            <Text size="small" leading="compact">
              {t(`integration.history.secret.${entry.op}`)}
            </Text>
          ) : (
            <>
              <DiffValue field={fields.get(entry.field)} value={entry.from} />
              <ArrowRightMini className="text-ui-fg-muted" />
              <DiffValue field={fields.get(entry.field)} value={entry.to} />
              {entry.truncated && (
                <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
                  {t("integration.history.truncated")}
                </Text>
              )}
            </>
          )}
        </div>
      ))}
      {rest > 0 && (
        <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
          {t("integration.history.moreFields", { count: rest })}
        </Text>
      )}
    </div>
  )
}
