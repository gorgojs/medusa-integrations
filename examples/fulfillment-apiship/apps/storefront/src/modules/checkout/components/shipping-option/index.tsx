"use client"

import type React from "react"
import {
  ShippingOptionCardShell,
  type ShippingOptionCardProps,
} from "./shared"

/**
 * Picks the card that renders one shipping option. A provider that needs more than the
 * delivery dates and a price takes a file under `providers/`, written against the
 * `ShippingOptionCardProps` of `shared.tsx`, and a case below.
 */
const ShippingOptionCard: React.FC<ShippingOptionCardProps> = (props) => {
  switch (true) {
    default:
      return (
        <ShippingOptionCardShell
          option={props.option}
          isSelected={props.isSelected}
          isUnavailable={props.isUnavailable}
          price={props.price}
          isLoadingPrice={props.isLoadingPrice}
          isFreeShipping={props.isFreeShipping}
          caption={props.deliveryLabel}
        />
      )
  }
}

export default ShippingOptionCard
