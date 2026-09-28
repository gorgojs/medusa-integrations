"use client"

import type React from "react"
import { isApishipOption } from "@modules/checkout/components/apiship"
import ApishipShippingOptionCard from "./providers/apiship"
import ManualShippingOptionCard from "./providers/manual"
import type { ShippingOptionCardProps } from "./shared"

/**
 * Picks the card that renders one shipping option. A provider that needs more than the
 * delivery dates and a price takes a file under `providers/`, written against the
 * `ShippingOptionCardProps` of `shared.tsx`, and a case below.
 */
const ShippingOptionCard: React.FC<ShippingOptionCardProps> = (props) => {
  switch (true) {
    case isApishipOption(props.option):
      return <ApishipShippingOptionCard {...props} />
    default:
      return <ManualShippingOptionCard {...props} />
  }
}

export default ShippingOptionCard
