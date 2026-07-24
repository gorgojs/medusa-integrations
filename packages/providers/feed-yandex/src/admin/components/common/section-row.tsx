import { Text, clx } from "@medusajs/ui"

export type SectionRowProps = {
  title: string
  value?: React.ReactNode | string | null
  actions?: React.ReactNode
  className?: string
}

export const SectionRow = ({ title, value, actions, className }: SectionRowProps) => {
  const isSimpleText = typeof value === "string" || value === null || value === undefined
  const hasActions = Boolean(actions)

  const containerClasses = clx(
    "text-ui-fg-subtle grid items-center px-6 py-4",
    hasActions ? "grid-cols-[1fr_1fr_28px]" : "grid-cols-2"
  )
  
  const textClasses = clx(
    className,
    isSimpleText ? "whitespace-pre-line text-pretty" : "flex flex-wrap gap-1"
  )

  return (
    <div className={containerClasses}>
      <Text size="small" weight="plus" leading="compact">
        {title}
      </Text>

      {isSimpleText ? (
        <Text
          size="small"
          leading="compact"
          className={textClasses}
        >
          {value ?? "-"}
        </Text>
      ) : (
        <div className={textClasses}>{value}</div>
      )}

      {hasActions && <div>{actions}</div>}
    </div>
  )
}
