import { IReceipt } from "@a2seven/yoo-checkout"

export function buildReceiptTemplate(receipt: IReceipt) {
  const firstItem = receipt.items?.[0]
  if (!firstItem || !firstItem.amount) {
    return "{}"
  }
  const tpl = {
    cur: firstItem.amount.currency,
    vat: firstItem?.vat_code,
    sub: firstItem?.payment_subject,
    ts: receipt.tax_system_code,
    e: receipt.customer?.email,
    p: receipt.customer?.phone,
    desc: "Refund for order"
  }

  const compact = JSON.stringify(tpl, (_k, v) => (v === undefined ? undefined : v))
  if (compact.length > 512) {
    throw new Error("receipt_tpl exceeds 512 chars, shorten fields")
  }
  return compact
}

type ReceiptTpl = {
  cur: string
  vat: number
  sub: string
  ts?: number
  e?: string
  p?: string
  desc?: string
}

function trunc128(s: string) {
  return s.length <= 128 ? s : s.slice(0, 125) + "…"
}

export function buildRefundReceiptSimple(
  refundValue: string,
  receiptTemplateplString: string
): IReceipt {
  let tpl: ReceiptTpl
  try {
    tpl = JSON.parse(receiptTemplateplString)
  } catch {
    throw new Error("Invalid receipt_tmp in metadata")
  }

  const receipt: IReceipt = {
    customer: {
      ...(tpl.e ? { email: tpl.e } : {}),
      ...(tpl.p ? { phone: tpl.p } : {}),
    },
    ...(tpl.ts ? { tax_system_code: tpl.ts as any } : {}),
    items: [
      {
        description: trunc128(tpl.desc || "Refund"),
        quantity: "1",
        amount: { value: refundValue, currency: tpl.cur || "RUB" },
        vat_code: tpl.vat as any,
        payment_subject: tpl.sub as any,
        payment_mode: "full_payment",
      },
    ],
  }

  return receipt
}