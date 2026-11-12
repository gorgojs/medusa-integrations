import { Text } from "@medusajs/ui"
import { ArrowRightMini } from "@medusajs/icons"
import { useTranslation } from "react-i18next"
import { DetailRow } from "./detail-row"
import { DiffValue, useDiffLabel } from "./diff-rows"
import type { DiffEntry, UiField } from "../../../types"

/** A `json` option as formatted JSON: the summary the form shows would hide what changed. */
const JsonValue = ({ value }: { value: unknown }) =>
  value == null ? (
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      -
    </Text>
  ) : (
    <pre className="bg-ui-bg-subtle txt-compact-xsmall max-h-60 overflow-auto rounded-md p-2 font-mono whitespace-pre-wrap break-all">
      {JSON.stringify(value, null, 2)}
    </pre>
  )

/** Every changed option of a change, one row each: "before → after", or what happened to a secret. */
export const ChangeDiff = ({ diff, fields }: { diff: DiffEntry[]; fields: Map<string, UiField> }) => {
  const { t } = useTranslation("gorgo")
  const labelOf = useDiffLabel(fields)

  return (
    <>
      {diff.map((entry) => {
        const field = fields.get(entry.field)
        const isJson = field?.control === "json" && !field.secret
        return (
          <DetailRow key={entry.field} label={labelOf(entry)}>
            {"secret" in entry ? (
              <Text size="small" leading="compact">
                {t(`integration.history.secret.${entry.op}`)}
              </Text>
            ) : (
              <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-start gap-x-4">
                <div className="min-w-0">
                  {isJson ? <JsonValue value={entry.from} /> : <DiffValue field={field} value={entry.from} />}
                </div>
                <ArrowRightMini className="text-ui-fg-muted mt-0.5" />
                <div className="min-w-0">
                  {isJson ? <JsonValue value={entry.to} /> : <DiffValue field={field} value={entry.to} />}
                  {entry.truncated && (
                    <Text size="xsmall" leading="compact" className="text-ui-fg-muted">
                      {t("integration.history.truncated")}
                    </Text>
                  )}
                </div>
              </div>
            )}
          </DetailRow>
        )
      })}
    </>
  )
}
