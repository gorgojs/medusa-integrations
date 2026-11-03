import { Text, Tooltip } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { ChangeActor } from "./change-actor"
import { FieldBadges } from "./field-badges"
import { changeTitle } from "./change-title"
import { useChangeTimeFormat } from "../../lib/changes"
import type { AdminIntegrationChange, UiDescriptor, UiField } from "../../../types"

/** Option fields and section titles of the current descriptor, for labelling old changes. */
export function descriptorLookup(descriptor: UiDescriptor | null | undefined) {
  const fields = new Map<string, UiField>()
  const sections = new Map<string, string>()
  for (const section of descriptor?.sections ?? []) {
    sections.set(section.id, section.title)
    for (const field of section.fields) fields.set(field.name, field)
  }
  return { fields, sections }
}

const Dot = () => (
  <div className="flex size-5 items-center justify-center">
    <div className="bg-ui-bg-base shadow-borders-base flex size-2.5 items-center justify-center rounded-full">
      <div className="bg-ui-fg-muted size-1.5 rounded-full" />
    </div>
  </div>
)

/**
 * The change history as a timeline, newest first: the headline and the time, who made the change,
 * and the options it touched. Values are in the change card, which a click on the entry opens.
 * The line under the last entry is dotted when older changes follow and absent when that entry is
 * the integration's first.
 */
export const ChangeTimeline = ({
  changes,
  descriptor,
  hasMore = false,
  onSelect,
}: {
  changes: AdminIntegrationChange[]
  /** The integration's current descriptor. Missing for a provider that is gone. */
  descriptor?: UiDescriptor | null
  /** Older changes exist beyond the ones shown. */
  hasMore?: boolean
  /** Open the change card. Without it the entries are not clickable. */
  onSelect?: (change: AdminIntegrationChange) => void
}) => {
  const { t } = useTranslation()
  const time = useChangeTimeFormat()
  const { fields } = descriptorLookup(descriptor)

  return (
    <div className="flex flex-col px-6 py-4">
      {changes.map((change, i) => {
        const title = changeTitle(change)
        const isLast = i === changes.length - 1
        const body = (
          <div className="grid grid-cols-[20px_1fr] gap-x-2">
            {/* The padding sits inside the entry, so the line runs on into the next one. */}
            <div className="flex flex-col items-center gap-y-0.5 pt-1.5">
              <Dot />
              {!isLast ? (
                <div className="bg-ui-border-base w-px flex-1" />
              ) : (
                hasMore && <div className="border-ui-border-base w-0 flex-1 border-l border-dotted" />
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-y-1 pb-3 pt-1.5">
              <div className="flex items-center justify-between gap-x-2">
                <Text size="small" leading="compact" weight="plus" className="truncate">
                  {t(title.key, title.values)}
                </Text>
                <Tooltip content={time.full(change.occurred_at)}>
                  <Text size="small" leading="compact" className="text-ui-fg-subtle shrink-0">
                    {time.relative(change.occurred_at)}
                  </Text>
                </Tooltip>
              </div>
              <div className="flex min-w-0 items-center gap-x-2">
                <Text size="small" leading="compact" className="text-ui-fg-subtle shrink-0">
                  {t("integration.history.by")}
                </Text>
                <ChangeActor change={change} />
              </div>
              <FieldBadges diff={change.diff} fields={fields} className="pt-1.5" />
            </div>
          </div>
        )
        return onSelect ? (
          <button
            key={change.id}
            type="button"
            onClick={() => onSelect(change)}
            // Negative margin: the hover fills the gutter while the dots stay in line with the header.
            className="hover:bg-ui-bg-base-hover focus-visible:shadow-borders-focus -mx-2 rounded-md px-2 text-left outline-none"
          >
            {body}
          </button>
        ) : (
          <div key={change.id}>{body}</div>
        )
      })}
    </div>
  )
}
