import { generateReceipt } from "../generate-receipt"
import { buildReceiptTemplate, buildRefundReceiptSimple } from "../build-receipt-template"

const baseCart = {
  email: "buyer@example.com",
  currency_code: "rub",
  shipping_total: 0,
  shipping_methods: [],
  shipping_address: { phone: "+71234567890", first_name: "Иван", last_name: "Петров" },
  items: [
    { product_title: "Item 1", unit_price: 1500, quantity: 1, total: 1500 },
  ],
}

describe("generateReceipt", () => {
  describe("basic structure", () => {
    it("maps cart → IReceipt with customer, items", () => {
      const receipt: any = generateReceipt(undefined, 1, 1, baseCart)

      expect(receipt.customer).toBeDefined()
      expect(receipt.customer.full_name).toBe("Петров Иван")
      expect(receipt.customer.email).toBe("buyer@example.com")
      expect(receipt.customer.phone).toBe("+71234567890")
      expect(Array.isArray(receipt.items)).toBe(true)
      expect(receipt.items).toHaveLength(1)
    })

    it("sets tax_system_code when provided", () => {
      const receipt: any = generateReceipt(1, 1, 1, baseCart)
      expect(receipt.tax_system_code).toBe(1)
    })

    it("omits tax_system_code when not provided", () => {
      const receipt: any = generateReceipt(undefined, 1, 1, baseCart)
      expect(receipt.tax_system_code).toBeUndefined()
    })
  })

  describe("item mapping", () => {
    it("maps a single cart item to IReceipt item with correct fields", () => {
      const receipt: any = generateReceipt(undefined, 1, 1, baseCart)
      const item = receipt.items[0]

      expect(item.description).toBe("Item 1")
      expect(item.amount.value).toBe("1500.00") // formatCurrency(1500, "rub")
      expect(item.amount.currency).toBe("RUB") // uppercased
      expect(item.quantity).toBe("1")
      expect(item.vat_code).toBe(1)
      expect(item.payment_subject).toBe("commodity")
      expect(item.payment_mode).toBe("full_payment")
    })

    it("formats item description as 'Product (Variant)' when variant_title is present", () => {
      const cart = {
        ...baseCart,
        items: [
          { product_title: "T-Shirt", variant_title: "Red / L", unit_price: 1000, quantity: 2, total: 2000 },
        ],
      }
      const receipt: any = generateReceipt(undefined, 1, 1, cart)
      expect(receipt.items[0].description).toBe("T-Shirt (Red / L)")
    })

    it("uses taxItem vat_code on regular items and taxShipping vat_code on shipping", () => {
      const cart = {
        ...baseCart,
        shipping_total: 500,
        shipping_methods: [{ name: "DHL" }],
      }
      const receipt: any = generateReceipt(undefined, 3, 2, cart) // taxItem=3, taxShipping=2

      expect(receipt.items[0].vat_code).toBe(3) // product
      expect(receipt.items[1].vat_code).toBe(2) // shipping
    })
  })

  describe("shipping item", () => {
    it("appends a shipping item when shipping_total > 0", () => {
      const cart = {
        ...baseCart,
        shipping_total: 500,
        shipping_methods: [{ name: "Boxberry" }],
      }
      const receipt: any = generateReceipt(undefined, 1, 1, cart)

      expect(receipt.items).toHaveLength(2)
      expect(receipt.items[1].description).toBe("Boxberry")
      expect(receipt.items[1].amount.value).toBe("500.00")
      expect(receipt.items[1].payment_subject).toBe("service")
    })

    it("falls back to 'Shipping' name when shipping_methods is empty", () => {
      const cart = { ...baseCart, shipping_total: 500, shipping_methods: [] }
      const receipt: any = generateReceipt(undefined, 1, 1, cart)
      expect(receipt.items[1].description).toBe("Shipping")
    })

    it("truncates very long shipping method names to 128 chars with ellipsis", () => {
      const longName = "A".repeat(200)
      const cart = {
        ...baseCart,
        shipping_total: 500,
        shipping_methods: [{ name: longName }],
      }
      const receipt: any = generateReceipt(undefined, 1, 1, cart)
      expect(receipt.items[1].description.length).toBe(126) // 125 + "…"
      expect(receipt.items[1].description.endsWith("…")).toBe(true)
    })
  })

  describe("customer phone stripping", () => {
    it("strips non-digit/non-plus characters from phone", () => {
      const cart = {
        ...baseCart,
        shipping_address: { ...baseCart.shipping_address, phone: "+7 (123) 456-78-90" },
      }
      const receipt: any = generateReceipt(undefined, 1, 1, cart)
      expect(receipt.customer.phone).toBe("+71234567890")
    })
  })

  describe("throws when cart items is empty", () => {
    it("throws 'Receipt items cannot be empty' when no items and no shipping", () => {
      const cart = { ...baseCart, items: [], shipping_total: 0 }
      expect(() => generateReceipt(undefined, 1, 1, cart)).toThrow(/Receipt items cannot be empty/)
    })
  })
})

describe("buildReceiptTemplate", () => {
  it("returns '{}' for an empty receipt (no items)", () => {
    expect(buildReceiptTemplate({} as any)).toBe("{}")
  })

  it("builds a compact JSON template from the first item", () => {
    const receipt: any = generateReceipt(1, 1, 1, baseCart)
    const tpl = buildReceiptTemplate(receipt)
    const parsed = JSON.parse(tpl)

    expect(parsed.cur).toBe("RUB")
    expect(parsed.vat).toBe(1)
    expect(parsed.sub).toBe("commodity")
    expect(parsed.ts).toBe(1) // tax_system_code
    expect(parsed.e).toBe("buyer@example.com")
    expect(parsed.p).toBe("+71234567890")
  })

  it("omits undefined fields (e.g. tax_system_code when absent)", () => {
    const receipt: any = generateReceipt(undefined, 1, 1, {
      ...baseCart,
      email: undefined,
      shipping_address: { ...baseCart.shipping_address, phone: undefined },
    })
    const tpl = buildReceiptTemplate(receipt)
    const parsed = JSON.parse(tpl)

    expect(parsed.ts).toBeUndefined()
    expect(parsed.e).toBeUndefined()
    expect(parsed.p).toBeUndefined()
  })

  it("throws when template string would exceed 512 chars", () => {
    const longEmail = "a".repeat(500) + "@example.com"
    const cart = {
      ...baseCart,
      email: longEmail,
    }
    const receipt: any = generateReceipt(1, 1, 1, cart)
    expect(() => buildReceiptTemplate(receipt)).toThrow(/512/)
  })
})

describe("buildRefundReceiptSimple", () => {
  const receiptTemplate = JSON.stringify({
    cur: "RUB",
    vat: 1,
    sub: "commodity",
    ts: 1,
    e: "buyer@example.com",
    p: "+71234567890",
    desc: "Refund for order",
  })

  it("builds a refund receipt from the compact template and refund amount", () => {
    const refund: any = buildRefundReceiptSimple("500.00", receiptTemplate)

    expect(refund.items).toHaveLength(1)
    expect(refund.items[0].description).toBe("Refund for order")
    expect(refund.items[0].amount.value).toBe("500.00")
    expect(refund.items[0].amount.currency).toBe("RUB")
    expect(refund.items[0].quantity).toBe("1")
    expect(refund.items[0].vat_code).toBe(1)
    expect(refund.items[0].payment_subject).toBe("commodity")
    expect(refund.items[0].payment_mode).toBe("full_payment")
  })

  it("restores customer email and phone from template", () => {
    const refund: any = buildRefundReceiptSimple("500.00", receiptTemplate)

    expect(refund.customer.email).toBe("buyer@example.com")
    expect(refund.customer.phone).toBe("+71234567890")
  })

  it("restores tax_system_code from template", () => {
    const refund: any = buildRefundReceiptSimple("500.00", receiptTemplate)
    expect(refund.tax_system_code).toBe(1)
  })

  it("falls back to 'Refund' when template has no desc field", () => {
    const tpl = JSON.stringify({ cur: "RUB", vat: 1, sub: "commodity" })
    const refund: any = buildRefundReceiptSimple("100.00", tpl)
    expect(refund.items[0].description).toBe("Refund")
  })

  it("throws when the template string is invalid JSON", () => {
    expect(() => buildRefundReceiptSimple("100.00", "not json")).toThrow(
      /Invalid receipt_tmp in metadata/
    )
  })
})
