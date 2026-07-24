
import {
  IItemWithoutData,
  IReceipt
} from "@a2seven/yoo-checkout"
import {
  TaxSystemCode,
  VatCode
} from "../types"
import {
  formatCurrency
} from "./format-currency"

export function generateReceipt(
  taxSystemCode: TaxSystemCode | undefined,
  taxItem: VatCode,
  taxShipping: VatCode,
  cart: Record<string, any>
): IReceipt {

  const email = cart?.email as string
  const rawPhone = cart?.shipping_address.phone as string
  const phone = rawPhone?.replace(/[^\d+]/g, "")
  const items = cart?.items as Array<Record<string, any>>
  const currencyCode = cart?.currency_code as string
  const shippingTotal = cart?.shipping_total as number
  const shippingMethods = cart?.shipping_methods as Array<Record<string, any>>
  const shippingAddress = cart?.shipping_address as Record<string, any>

  const fullName = `${shippingAddress.last_name} ${shippingAddress.first_name}`

  const receipt = {} as IReceipt

  receipt.customer = {
    full_name: fullName,
    email: email,
    ...(phone ? { phone: phone } : {}),
  }

  if (taxSystemCode) {
    receipt.tax_system_code = taxSystemCode
  }
  const receiptItems: IItemWithoutData[] = items.map((i) => ({
    description: i.variant_title
      ? `${i.product_title} (${i.variant_title})`
      : i.product_title as string,
    amount: {
      value: formatCurrency(i.unit_price, currencyCode),
      currency: currencyCode.toUpperCase()
    },
    quantity: i.quantity.toString(),
    vat_code: taxItem,
    payment_subject: "commodity",
    payment_mode: "full_payment"
  }))

  if (shippingTotal > 0) {
    const name = shippingMethods?.[0]?.name ?? 'Shipping'
    const amount = formatCurrency(shippingTotal, currencyCode)
    receiptItems.push({
      description: name.length > 128 ? name.slice(0, 125) + '…' : name,
      amount: {
        value: amount,
        currency: currencyCode.toUpperCase()
      },
      quantity: "1",
      vat_code: taxShipping,
      payment_subject: "service",
      payment_mode: "full_payment"
    })
  }

  if (receiptItems.length === 0) {
    throw new Error("Receipt items cannot be empty")
  }

  receipt.items = receiptItems
  return receipt
}
