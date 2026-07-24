import {
  Tax,
  Taxation,
  Receipt,
  ReceiptItem
} from "../types";

export function generateReceipt(
  taxSystemCode: Taxation,
  taxItem: Tax,
  taxShipping: Tax,
  cart: Record<string, any>
): Receipt {

  const items = cart?.items as Array<Record<string, any>>
  const shippingTotal = cart?.shipping_total as number
  const shippingMethods = cart?.shipping_methods as Array<Record<string, any>>
  const shippingAddress = cart?.shipping_address as Record<string, any>

  const receipt = {} as Receipt
  receipt.sno = taxSystemCode

  const receiptItems: ReceiptItem[] = items.map((i) => ({
    name: i.variant_title
      ? `${i.product_title} (${i.variant_title})`
      : i.product_title as string,
    quantity: i.quantity,
    cost: i.unit_price,
    sum: i.total,
    payment_method: "full_payment",
    payment_object: "commodity",
    tax: taxItem,
  }))
 
  if (shippingTotal > 0) {
    const name = shippingMethods?.[0]?.name ?? 'Shipping'
    receiptItems.push({
      name: name.length > 128 ? name.slice(0, 125) + '…' : name,
      quantity: 1,
      cost: shippingTotal,
      sum: shippingTotal,
      payment_method: "full_payment",
      payment_object: "service",
      tax: taxShipping
    })
  }

  receipt.items = receiptItems
  return receipt
}