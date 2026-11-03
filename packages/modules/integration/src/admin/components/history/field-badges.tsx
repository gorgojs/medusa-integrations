import { Badge, clx } from "@medusajs/ui"
import { useDiffLabel } from "./diff-rows"
import type { DiffEntry, UiField } from "../../../types"

/** How many options a change names before the rest becomes "+N". */
const MAX_BADGES = 3

/** The options a change touched, as badges. Nothing for a change without options. */
export const FieldBadges = ({
  diff,
  fields,
  className,
}: {
  diff: DiffEntry[]
  /** The current descriptor's options; without them the labels stored with the change are used. */
  fields: Map<string, UiField>
  className?: string
}) => {
  const labelOf = useDiffLabel(fields)
  if (!diff.length) return null
  const rest = diff.length - MAX_BADGES

  return (
    <div className={clx("flex flex-wrap gap-1", className)}>
      {diff.slice(0, MAX_BADGES).map((entry) => (
        <Badge key={entry.field} size="2xsmall">
          {labelOf(entry)}
        </Badge>
      ))}
      {rest > 0 && <Badge size="2xsmall">+{rest}</Badge>}
    </div>
  )
}
