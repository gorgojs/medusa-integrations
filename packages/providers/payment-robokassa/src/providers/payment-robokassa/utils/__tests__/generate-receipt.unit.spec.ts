import { generateReceipt } from "../generate-receipt"

const baseCart = {
  shipping_total: 0,
  shipping_methods: [],
  items: [
    { product_title: "Widget", unit_price: 15, quantity: 1, total: 15 },
  ],
}

describe("generateReceipt", () => {
  describe("basic structure", () => {
    it("sets sno from taxSystemCode", () => {
      const receipt = generateReceipt("osn", "none", "none", baseCart)
      expect(receipt.sno).toBe("osn")
    })

    it("maps cart items to receipt items", () => {
      const receipt = generateReceipt("osn", "none", "none", baseCart)
      expect(receipt.items).toHaveLength(1)
      expect(receipt.items[0]).toMatchObject({
        name: "Widget",
        quantity: 1,
        cost: 15,
        sum: 15,
        tax: "none",
        payment_method: "full_payment",
        payment_object: "commodity",
      })
    })

    it("uses unit_price as cost and total as sum (amounts are not converted to kopecks)", () => {
      const cart = { ...baseCart, items: [{ product_title: "X", unit_price: 99.99, quantity: 2, total: 199.98 }] }
      const receipt = generateReceipt("osn", "vat20", "none", cart)
      expect(receipt.items[0].cost).toBe(99.99)
      expect(receipt.items[0].sum).toBe(199.98)
    })
  })

  describe("item naming", () => {
    it("uses product_title when variant_title is absent", () => {
      const receipt = generateReceipt("osn", "none", "none", baseCart)
      expect(receipt.items[0].name).toBe("Widget")
    })

    it("formats name as 'Product (Variant)' when variant_title is present", () => {
      const cart = {
        ...baseCart,
        items: [{ product_title: "T-Shirt", variant_title: "Red / L", unit_price: 10, quantity: 1, total: 10 }],
      }
      const receipt = generateReceipt("osn", "none", "none", cart)
      expect(receipt.items[0].name).toBe("T-Shirt (Red / L)")
    })
  })

  describe("tax application", () => {
    it("applies taxItem to regular items", () => {
      const receipt = generateReceipt("osn", "vat20", "vat10", baseCart)
      expect(receipt.items[0].tax).toBe("vat20")
    })
  })

  describe("shipping item", () => {
    it("appends a shipping item when shipping_total > 0", () => {
      const cart = { ...baseCart, shipping_total: 500, shipping_methods: [{ name: "СДЭК" }] }
      const receipt = generateReceipt("osn", "none", "vat10", cart)

      expect(receipt.items).toHaveLength(2)
      expect(receipt.items[1]).toMatchObject({
        name: "СДЭК",
        quantity: 1,
        cost: 500,
        sum: 500,
        tax: "vat10",
        payment_method: "full_payment",
        payment_object: "service",
      })
    })

    it("falls back to 'Shipping' when shipping_methods is empty", () => {
      const cart = { ...baseCart, shipping_total: 100, shipping_methods: [] }
      const receipt = generateReceipt("osn", "none", "none", cart)
      expect(receipt.items[1].name).toBe("Shipping")
    })

    it("falls back to 'Shipping' when shipping_methods[0].name is missing", () => {
      const cart = { ...baseCart, shipping_total: 100, shipping_methods: [{}] }
      const receipt = generateReceipt("osn", "none", "none", cart)
      expect(receipt.items[1].name).toBe("Shipping")
    })

    it("truncates a shipping name longer than 128 chars with ellipsis", () => {
      const longName = "A".repeat(200)
      const cart = { ...baseCart, shipping_total: 100, shipping_methods: [{ name: longName }] }
      const receipt = generateReceipt("osn", "none", "none", cart)
      expect(receipt.items[1].name.length).toBe(126) // 125 chars + '…'
      expect(receipt.items[1].name.endsWith("…")).toBe(true)
    })

    it("does not append a shipping item when shipping_total is 0", () => {
      const receipt = generateReceipt("osn", "none", "none", baseCart)
      expect(receipt.items).toHaveLength(1)
    })
  })

  describe("multiple items", () => {
    it("maps all cart items preserving order", () => {
      const cart = {
        ...baseCart,
        items: [
          { product_title: "A", unit_price: 10, quantity: 1, total: 10 },
          { product_title: "B", unit_price: 20, quantity: 2, total: 40 },
          { product_title: "C", unit_price: 5, quantity: 3, total: 15 },
        ],
      }
      const receipt = generateReceipt("osn", "none", "none", cart)
      expect(receipt.items).toHaveLength(3)
      expect(receipt.items.map(i => i.name)).toEqual(["A", "B", "C"])
    })
  })
})
