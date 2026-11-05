"use client"

import type { DeliveryDays } from "@lib/util/fulfillment"
import type { HttpTypes } from "@medusajs/types"
import { RadioGroup, clx } from "@medusajs/ui"
import { Loader } from "@medusajs/icons"
import type { ReactNode } from "react"

/**
 * Props every card under `providers/` receives. They all take the same shape, so the
 * dispatcher in `index.tsx` hands one set of values to whichever card the option's
 * provider selects.
 */
export type ShippingOptionCardProps = {
  cart: HttpTypes.StoreCart
  option: HttpTypes.StoreCartShippingOptionWithServiceZone
  isSelected: boolean
  /** The provider priced the cart and came back with nothing, so it cannot be picked. */
  isUnavailable: boolean
  /** Formatted price. Null shows nothing, which is how a card says it has no price yet. */
  price: ReactNode
  /** The price is still being calculated, so the card shows a spinner in its place. */
  isLoadingPrice: boolean
  isFreeShipping: boolean
  /** Delivery dates, already formatted and translated. */
  deliveryLabel: string | null
  formatDeliveryDays: (days: DeliveryDays | null) => string | null
}

type ShippingOptionCardShellProps = Pick<
  ShippingOptionCardProps,
  | "option"
  | "isSelected"
  | "isUnavailable"
  | "price"
  | "isLoadingPrice"
  | "isFreeShipping"
> & {
  /** The line above the price. A provider puts its own summary here. */
  caption?: ReactNode
}

/**
 * The card every shipping option shares. A provider card keeps the same frame and radio
 * behaviour and only replaces what sits above the price.
 */
export const ShippingOptionCardShell = ({
  option,
  isSelected,
  isUnavailable,
  price,
  isLoadingPrice,
  isFreeShipping,
  caption,
}: ShippingOptionCardShellProps) => {
  return (
    <div
      className={clx(
        "relative flex w-[180px] shrink-0 flex-col gap-2 justify-between rounded-md border bg-ui-bg-base p-3 text-start transition-colors",
        isUnavailable
          ? "border-ui-border-base opacity-60"
          : "hover:bg-ui-bg-base-hover",
        !isUnavailable &&
        (isSelected
          ? "border-ui-border-interactive"
          : "border-ui-border-base hover:border-ui-border-interactive/50")
      )}
      data-testid="delivery-option-radio"
    >
      <RadioGroup.Item
        value={option.id}
        aria-label={option.name}
        disabled={isUnavailable}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer rounded-md bg-transparent outline-none [&>div]:hidden focus-visible:shadow-borders-interactive-with-focus disabled:cursor-not-allowed"
      />
      <span className="txt-compact-medium-plus text-ui-fg-base">
        {option.name}
      </span>
      <div className="flex flex-col gap-y-0">
        <div className="min-h-[20px]">
          {caption && (
            <span className="txt-compact-small text-ui-fg-subtle">
              {caption}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-x-3">
          <div
            className={clx(
              "txt-compact-small-plus flex min-h-[20px] items-end",
              isFreeShipping ? "text-ui-tag-green-icon" : "text-ui-fg-subtle"
            )}
          >
            {isLoadingPrice ? (
              <Loader className="h-3 w-3 animate-spin" />
            ) : (
              price
            )}
          </div>

          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            <div
              className={clx(
                "flex h-3.5 w-3.5 items-center justify-center rounded-full border bg-ui-bg-base shadow-borders-base",
                isSelected
                  ? "border-ui-border-interactive bg-ui-bg-interactive shadow-borders-interactive-with-shadow"
                  : "border-ui-border-base"
              )}
            >
              {isSelected && (
                <div className="h-1.5 w-1.5 rounded-full bg-ui-bg-base shadow-details-contrast-on-bg-interactive" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
