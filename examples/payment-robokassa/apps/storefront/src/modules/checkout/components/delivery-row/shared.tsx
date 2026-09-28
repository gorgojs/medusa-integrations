"use client"

import type { HttpTypes } from "@medusajs/types"
import MapPin from "@modules/common/icons/map-pin"
import CheckoutInfoRow from "@modules/checkout/components/checkout-info-rows/row"
import type { ReactNode } from "react"

/**
 * Props every row under `providers/` receives. The row sits under the shipping cards and
 * collects whatever the selected method needs from the customer, an address for the
 * starter's own methods and something else for a provider that asks for more.
 */
export type DeliveryRowProps = {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
  addresses: HttpTypes.StoreCustomerAddress[] | null
  /** The option the customer picked, or null while nothing is selected. */
  option: HttpTypes.StoreCartShippingOptionWithServiceZone | null
}

type DeliveryRowShellProps = {
  heading: string
  onClick: () => void
  value?: ReactNode
  hidden?: boolean
  disabled?: boolean
  "data-testid"?: string
}

/**
 * The row every delivery step shares, so a provider row keeps the same icon, spacing and
 * affordance as the address row it replaces.
 */
export const DeliveryRowShell = ({
  heading,
  onClick,
  value,
  hidden,
  disabled,
  "data-testid": dataTestId,
}: DeliveryRowShellProps) => (
  <CheckoutInfoRow
    icon={<MapPin size={24} />}
    heading={heading}
    value={value}
    onClick={onClick}
    hidden={hidden}
    disabled={disabled}
    data-testid={dataTestId}
  />
)
