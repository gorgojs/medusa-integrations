"use client"

import {
  ShippingOptionCardShell,
  type ShippingOptionCardProps,
} from "../shared"

const ManualShippingOptionCard = ({
  option,
  isSelected,
  isUnavailable,
  price,
  isLoadingPrice,
  isFreeShipping,
  deliveryLabel,
}: ShippingOptionCardProps) => (
  <ShippingOptionCardShell
    option={option}
    isSelected={isSelected}
    isUnavailable={isUnavailable}
    price={price}
    isLoadingPrice={isLoadingPrice}
    isFreeShipping={isFreeShipping}
    caption={deliveryLabel}
  />
)

export default ManualShippingOptionCard
