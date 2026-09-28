"use client"

import { isApishipOption } from "@modules/checkout/components/apiship"
import type React from "react"
import ApishipDeliveryRow from "./providers/apiship"
import ManualDeliveryRow from "./providers/manual"
import type { DeliveryRowProps } from "./shared"

/**
 * Picks the row that collects what the selected shipping method needs. A provider whose
 * method asks for something other than an address takes a file under `providers/`,
 * written against the `DeliveryRowProps` of `shared.tsx`, and a case below.
 */
const DeliveryRow: React.FC<DeliveryRowProps> = (props) => {
  switch (true) {
    case isApishipOption(props.option):
      return <ApishipDeliveryRow {...props} />
    default:
      return <ManualDeliveryRow {...props} />
  }
}

export default DeliveryRow
