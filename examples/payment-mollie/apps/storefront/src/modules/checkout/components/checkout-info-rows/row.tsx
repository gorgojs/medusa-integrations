"use client"

import { ChevronRight } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import type { ReactNode } from "react"

type CheckoutInfoRowProps = {
  icon: ReactNode
  heading: string
  value?: ReactNode
  onClick: () => void
  hidden?: boolean
  disabled?: boolean
  "data-testid"?: string
}

export default function CheckoutInfoRow({
  icon,
  heading,
  value,
  onClick,
  hidden,
  disabled,
  "data-testid": dataTestId,
}: CheckoutInfoRowProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      className={clx(
        "flex w-full items-center justify-between gap-x-2 border-b border-ui-border-base pb-6 text-start transition-colors",
        !disabled && "hover:border-ui-fg-base",
        hidden && "hidden"
      )}
      data-testid={dataTestId}
    >
      <div className="flex items-center gap-x-2">
        <span className="flex-shrink-0 text-ui-fg-base">{icon}</span>
        <div className="flex flex-col">
          <span className="txt-compact-medium text-ui-fg-muted">{heading}</span>
          {value && <span className="txt-compact-medium text-ui-fg-base">{value}</span>}
        </div>
      </div>
      {!disabled && (
        <ChevronRight className="text-ui-fg-base flex-shrink-0 rtl:rotate-180" />
      )}
    </button>
  )
}
