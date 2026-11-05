import { Badge, Tooltip, clx } from "@medusajs/ui"
import { useLayoutEffect, useRef, useState } from "react"
import { badgesThatFit } from "./badges-fit"
import { useDiffLabel } from "./diff-rows"
import type { DiffEntry, UiField } from "../../../types"

/** How many options a change names before the rest becomes "+N", where the badges may wrap. */
const MAX_BADGES = 3
/** The gap between badges, `gap-1`. */
const GAP = 4

/** "+N" for the options left out, with their names on hover. */
const MoreBadge = ({ hidden }: { hidden: string[] }) => (
  <Tooltip
    content={
      <ul>
        {hidden.map((label, i) => (
          <li key={i}>{label}</li>
        ))}
      </ul>
    }
  >
    <Badge size="2xsmall" className="shrink-0">
      +{hidden.length}
    </Badge>
  </Tooltip>
)

/**
 * The options a change touched, as badges. Nothing for a change without options.
 *
 * `fit` keeps them on one line, for a table row: as many as the width takes, the rest folded into
 * "+N". Without it they wrap, up to MAX_BADGES.
 */
export const FieldBadges = ({
  diff,
  fields,
  fit = false,
  className,
}: {
  diff: DiffEntry[]
  /** The current descriptor's options; without them the labels stored with the change are used. */
  fields: Map<string, UiField>
  fit?: boolean
  className?: string
}) => {
  const labelOf = useDiffLabel(fields)
  if (!diff.length) return null
  const labels = diff.map((entry) => labelOf(entry))
  if (fit) return <FittedBadges labels={labels} className={className} />

  return (
    <div className={clx("flex flex-wrap gap-1", className)}>
      {labels.slice(0, MAX_BADGES).map((label, i) => (
        <Badge key={i} size="2xsmall">
          {label}
        </Badge>
      ))}
      {labels.length > MAX_BADGES && <MoreBadge hidden={labels.slice(MAX_BADGES)} />}
    </div>
  )
}

/**
 * One line of badges that never grows its cell. Both rows are positioned absolutely, so the table
 * sizes the column without them and the badges follow its width: an invisible row measures every
 * badge, and the visible one shows those that fit. The last one shown is cut with an ellipsis when
 * even it does not fit. The box clips the measuring row, which would otherwise widen the table.
 */
const FittedBadges = ({ labels, className }: { labels: string[]; className?: string }) => {
  const box = useRef<HTMLDivElement>(null)
  const ruler = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(labels.length)
  const key = labels.join("\n")

  useLayoutEffect(() => {
    const fit = () => {
      const width = box.current?.clientWidth ?? 0
      const items = Array.from(ruler.current?.children ?? []) as HTMLElement[]
      const widths = items.slice(0, labels.length).map((el) => el.offsetWidth)
      const more = items[labels.length]?.offsetWidth ?? 0
      setCount(badgesThatFit(widths, more, width, GAP))
    }
    fit()
    const observer = new ResizeObserver(fit)
    if (box.current) observer.observe(box.current)
    return () => observer.disconnect()
  }, [key])

  return (
    <div ref={box} className={clx("relative h-5 w-full overflow-hidden", className)}>
      <div ref={ruler} aria-hidden className="invisible absolute left-0 top-0 flex gap-1">
        {labels.map((label, i) => (
          <Badge key={i} size="2xsmall" className="shrink-0">
            {label}
          </Badge>
        ))}
        <Badge size="2xsmall" className="shrink-0">
          +{labels.length}
        </Badge>
      </div>
      <div className="absolute inset-0 flex items-center gap-1 overflow-hidden">
        {labels.slice(0, count).map((label, i) => (
          <Badge key={i} size="2xsmall" className={i === count - 1 ? "min-w-0" : "shrink-0"}>
            <span className="truncate">{label}</span>
          </Badge>
        ))}
        {labels.length > count && <MoreBadge hidden={labels.slice(count)} />}
      </div>
    </div>
  )
}
