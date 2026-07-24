import { Input, Switch, Select, Label, Text, Textarea } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Controller, Control } from "react-hook-form"
import type { UiField } from "../../../types"

/** Minimal shape of i18next's `t` — avoids depending on i18next's type export directly. */
type Translate = (key: string, options?: Record<string, unknown>) => string

// Re-export so the form keeps importing the field shape from one place.
export type { UiField }

const jsonToText = (v: unknown) => (v == null || v === "" ? "" : JSON.stringify(v, null, 2))

/**
 * Basic editor for nested/array options (`control: "json"`). The form value is the parsed
 * object/array; the textarea holds the raw text so invalid intermediate input doesn't clobber
 * the last valid value. Deep validation (the field's zod schema) still runs server-side.
 */
const JsonField = ({ field, f }: { field: UiField; f: any }) => {
  const { t } = useTranslation()
  const [raw, setRaw] = useState(() => jsonToText(f.value))
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <Textarea
        rows={6}
        className="font-mono"
        placeholder={field.placeholder ? t(field.placeholder) : "[]"}
        value={raw}
        disabled={field.readonly === true}
        onBlur={f.onBlur}
        onChange={(e) => {
          const text = e.target.value
          setRaw(text)
          if (text.trim() === "") {
            setError(null)
            f.onChange(null)
            return
          }
          try {
            f.onChange(JSON.parse(text))
            setError(null)
          } catch {
            setError(t("integration.form.invalidJson"))
          }
        }}
      />
      {error && (
        <Text size="xsmall" className="text-ui-fg-error">
          {error}
        </Text>
      )}
    </>
  )
}

export const IntegrationField = ({
  field,
  control,
  secretConfigured = false,
}: {
  field: UiField
  control: Control<any>
  /** A secret is already stored — the field stays empty and blank means "keep current". */
  secretConfigured?: boolean
}) => {
  const { t } = useTranslation()

  // A configured secret is optional (blank = keep existing); only enforce required client-
  // side for non-secret fields or for secrets that have never been set.
  const enforceRequired =
    field.required && field.control !== "switch" && !(field.control === "secret" && secretConfigured)

  return (
    <div className="flex flex-col gap-1">
      <Label size="small" weight="plus">
        {t(field.label)}
        {field.required ? " *" : ""}
      </Label>
      <Controller
        name={field.name}
        control={control}
        // Inline required-field validation. Deeper rules (min length, enums, cross-field)
        // are validated server-side and surfaced as a message.
        rules={{
          required: enforceRequired
            ? t("integration.form.required", { field: t(field.label) })
            : false,
        }}
        render={({ field: f, fieldState }) => (
          <>
            {renderControl(field, f, secretConfigured, t)}
            {fieldState.error?.message && (
              <Text size="xsmall" className="text-ui-fg-error">
                {fieldState.error.message}
              </Text>
            )}
          </>
        )}
      />
      {field.hint && (
        <Text size="xsmall" className="text-ui-fg-subtle">
          {t(field.hint)}
        </Text>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderControl(field: UiField, f: any, secretConfigured: boolean, t: Translate) {
  const placeholder = field.placeholder ? t(field.placeholder) : undefined
  const disabled = field.readonly === true
  switch (field.control) {
    case "switch":
      return <Switch checked={!!f.value} onCheckedChange={f.onChange} disabled={disabled} />
    case "select":
      return (
        <Select value={f.value ?? ""} onValueChange={f.onChange} disabled={disabled}>
          <Select.Trigger>
            <Select.Value placeholder={placeholder} />
          </Select.Trigger>
          <Select.Content>
            {(field.options ?? []).map((o) => {
              const labelKey = field.optionLabels?.[o]
              return (
                <Select.Item key={o} value={o}>
                  {labelKey ? t(labelKey) : o}
                </Select.Item>
              )
            })}
          </Select.Content>
        </Select>
      )
    case "number":
      return (
        <Input
          type="number"
          placeholder={placeholder}
          value={f.value ?? ""}
          disabled={disabled}
          // Blank → explicit null = "clear": survives JSON.stringify (unlike `undefined`, which
          // is dropped from the body), and the server reads null as "absent" (clears the field).
          onChange={(e) => f.onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
        />
      )
    case "url":
      return (
        <Input
          type="url"
          placeholder={placeholder}
          value={f.value ?? ""}
          disabled={disabled}
          onChange={f.onChange}
        />
      )
    case "secret":
      return (
        <Input
          type="password"
          placeholder={secretConfigured ? t("integration.form.keepSecret") : placeholder ?? ""}
          value={f.value ?? ""}
          disabled={disabled}
          onChange={f.onChange}
          className={!f.value ? "[&~div]:hidden" : undefined}
        />
      )
    case "json":
      return <JsonField field={field} f={f} />
    default:
      return (
        <Input
          placeholder={placeholder}
          value={f.value ?? ""}
          disabled={disabled}
          onChange={f.onChange}
        />
      )
  }
}
