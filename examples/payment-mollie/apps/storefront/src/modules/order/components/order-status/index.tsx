"use client"

import { StatusBadge } from "@medusajs/ui"
import { useTranslations } from "next-intl"

type BadgeColor = "green" | "red" | "blue" | "orange" | "grey" | "purple"

/**
 * The colors mirror how the Medusa Admin reads the same statuses, so a shop
 * owner sees an order the same way on both sides: grey for nothing done yet,
 * orange for part way through, blue for on its way, green for finished and red
 * for something that needs attention.
 */
const FULFILLMENT_COLORS: Record<string, BadgeColor> = {
  canceled: "red",
  delivered: "green",
  fulfilled: "blue",
  not_fulfilled: "grey",
  partially_delivered: "orange",
  partially_fulfilled: "orange",
  partially_shipped: "orange",
  shipped: "blue",
}

const PAYMENT_COLORS: Record<string, BadgeColor> = {
  authorized: "orange",
  awaiting: "orange",
  canceled: "red",
  captured: "green",
  not_paid: "grey",
  partially_authorized: "orange",
  partially_captured: "orange",
  partially_refunded: "orange",
  refunded: "grey",
  requires_action: "red",
}

type OrderStatusBadgeProps = {
  kind: "fulfillment" | "payment"
  status?: string | null
  className?: string
}

const OrderStatusBadge = ({ kind, status, className }: OrderStatusBadgeProps) => {
  const t = useTranslations("OrderDetails")

  if (!status) {
    return null
  }

  const group = kind === "payment" ? "paymentStatuses" : "fulfillmentStatuses"
  const colors = kind === "payment" ? PAYMENT_COLORS : FULFILLMENT_COLORS

  // A future Medusa release can add a status this catalog has never heard of,
  // and a raw message key is not something to show a customer.
  const key = `${group}.${status}`
  const label = t.has(key) ? t(key) : status.replaceAll("_", " ")

  return (
    <StatusBadge
      color={colors[status] ?? "grey"}
      className={className}
      data-testid={`order-${kind}-status`}
      data-value={status}
    >
      {label}
    </StatusBadge>
  )
}

export default OrderStatusBadge
