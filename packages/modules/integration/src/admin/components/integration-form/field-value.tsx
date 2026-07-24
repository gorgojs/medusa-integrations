import { Badge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { UiField } from "../../../types"

const Dash = () => (
  <Text size="small" leading="compact" className="text-ui-fg-subtle">
    -
  </Text>
)

/**
 * Read-only renderer for a configured field value, mirroring Medusa admin's section rows.
 * Secrets are never shown (only "configured" vs "not set"); booleans render as a status tag.
 */
export const IntegrationFieldValue = ({
  field,
  value,
  secretConfigured = false,
}: {
  field: UiField
  value: unknown
  /** A secret is stored for this integration (the value itself is never sent to the client). */
  secretConfigured?: boolean
}) => {
  const { t } = useTranslation()

  if (field.secret || field.control === "secret") {
    return secretConfigured ? (
      <Text size="small" leading="compact">
        ••••••••
      </Text>
    ) : (
      <Dash />
    )
  }

  if (field.control === "switch") {
    if (value == null) return <Dash />
    return (
      <Badge size="2xsmall" color={value ? "green" : "grey"}>
        {value ? t("integration.status.enabled") : t("integration.status.disabled")}
      </Badge>
    )
  }

  // Nested/array values: summarize rather than dumping JSON into the row.
  if (field.control === "json") {
    if (Array.isArray(value)) {
      return value.length ? (
        <Text size="small" leading="compact">
          {t("integration.form.items", { count: value.length })}
        </Text>
      ) : (
        <Dash />
      )
    }
    if (value == null) return <Dash />
    return (
      <Text size="small" leading="compact">
        {t("integration.status.configured")}
      </Text>
    )
  }

  if (value == null || value === "") return <Dash />

  if (field.control === "select") {
    const labelKey = field.optionLabels?.[String(value)]
    return (
      <Badge size="2xsmall" color="grey">
        {labelKey ? t(labelKey) : String(value)}
      </Badge>
    )
  }

  return (
    <Text size="small" leading="compact">
      {String(value)}
    </Text>
  )
}
