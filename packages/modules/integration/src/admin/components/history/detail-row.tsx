import { Text } from "@medusajs/ui"
import type { ReactNode } from "react"

/** A row of the change card: the label in a 120px column, the value next to it, a line under both. */
export const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="border-ui-border-base grid grid-cols-[120px_1fr] items-start gap-x-4 border-b px-6 py-2 [overflow-wrap:anywhere]">
    <Text size="small" leading="compact" className="text-ui-fg-subtle">
      {label}
    </Text>
    <div className="flex min-w-0 items-center gap-x-2">{children}</div>
  </div>
)
