import type React from "react"

type OrderSectionProps = {
  title?: string
  children: React.ReactNode
  "data-testid"?: string
}

/**
 * One frame for every block on the two order pages. The confirmation and the
 * account copy of the same order used to disagree on heading size, spacing and
 * which sections they showed at all; they now compose from this.
 */
const OrderSection = ({
  title,
  children,
  "data-testid": dataTestid,
}: OrderSectionProps) => (
  <section
    className="flex flex-col gap-y-4 border-t border-ui-border-base pt-6"
    data-testid={dataTestid}
  >
    {title && <h2 className="text-large-semi text-ui-fg-base">{title}</h2>}
    {children}
  </section>
)

export default OrderSection

/** A labelled column inside a section, for example "Shipping address". */
export const OrderDetailColumn = ({
  label,
  children,
  "data-testid": dataTestid,
}: {
  label: string
  children: React.ReactNode
  "data-testid"?: string
}) => (
  <div className="flex flex-col gap-y-1" data-testid={dataTestid}>
    <span className="txt-compact-small-plus text-ui-fg-base">{label}</span>
    <div className="flex flex-col txt-medium text-ui-fg-subtle">{children}</div>
  </div>
)
