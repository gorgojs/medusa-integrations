import { Text, Tooltip, clx } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { ChangeActor } from "./change-actor"
import { DiffRows } from "./diff-rows"
import { changeTitle, isFailedChange } from "./change-title"
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

const Dot = ({ failed }: { failed: boolean }) => (
  <div className="flex size-5 items-center justify-center">
    <div className="bg-ui-bg-base shadow-borders-base flex size-2.5 items-center justify-center rounded-full">
      <div className={clx("size-1.5 rounded-full", failed ? "bg-ui-tag-red-icon" : "bg-ui-tag-neutral-icon")} />
    </div>
  </div>
)

/**
 * The change history as a timeline, newest first: what changed, the changed options, who did
 * it and when. Laid out like the activity timeline on Medusa's order page.
 */
export const ChangeTimeline = ({
  changes,
  descriptor,
  fieldLimit = 5,
  onSelect,
}: {
  changes: AdminIntegrationChange[]
  /** The integration's current descriptor. Missing for a provider that is gone. */
  descriptor?: UiDescriptor | null
  /** Changed options shown per entry before "and N more". */
  fieldLimit?: number
  /** Open the change card. Without it the entries are not clickable. */
  onSelect?: (change: AdminIntegrationChange) => void
}) => {
  const { t } = useTranslation()
  const time = useChangeTimeFormat()
  const { fields, sections } = descriptorLookup(descriptor)

  return (
    <div className="flex flex-col px-6 py-4">
      {changes.map((change, i) => {
        const sectionTitle = change.section_id ? sections.get(change.section_id) : undefined
        const title = changeTitle(change, sectionTitle ? t(sectionTitle) : null)
        const isLast = i === changes.length - 1
        return (
          <div key={change.id} className="grid grid-cols-[20px_1fr] items-start gap-x-2">
            <div className="flex size-full flex-col items-center gap-y-0.5">
              <Dot failed={isFailedChange(change)} />
              {!isLast && <div className="bg-ui-border-base min-h-[14px] w-px flex-1" />}
            </div>
            <div className={clx("flex min-w-0 flex-col gap-y-1", !isLast && "pb-4")}>
              <div className="flex items-start justify-between gap-x-2">
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(change)}
                    className="txt-compact-small-plus text-ui-fg-base hover:text-ui-fg-interactive text-left outline-none"
                  >
                    {t(title.key, title.values)}
                  </button>
                ) : (
                  <Text size="small" leading="compact" weight="plus">
                    {t(title.key, title.values)}
                  </Text>
                )}
                <Tooltip content={time.full(change.occurred_at)}>
                  <Text size="small" leading="compact" className="text-ui-fg-subtle shrink-0 text-right">
                    {time.relative(change.occurred_at)}
                  </Text>
                </Tooltip>
              </div>
              {change.diff.length > 0 && <DiffRows diff={change.diff} fields={fields} limit={fieldLimit} />}
              {change.message && (
                <Text size="small" leading="compact" className="text-ui-fg-subtle break-words">
                  {change.message}
                </Text>
              )}
              <ChangeActor change={change} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
