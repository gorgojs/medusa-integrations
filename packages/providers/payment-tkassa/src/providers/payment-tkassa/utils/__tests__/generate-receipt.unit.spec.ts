import { generateReceipt, generateRefundReceipt } from "../generate-receipt"

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
  describe("FFD 1.05", () => {
    it("maps cart → Receipt with FfdVersion, Taxation, Email, Phone, Items", () => {
      const receipt: any = generateReceipt("1.05", "osn", "none", "none", baseCart)

      expect(receipt.FfdVersion).toBe("1.05")
      expect(receipt.Taxation).toBe("osn")
      expect(receipt.Email).toBe("buyer@example.com")
      expect(receipt.Phone).toBe("+71234567890")
      expect(receipt.Items).toHaveLength(1)
      expect(receipt.Items[0]).toMatchObject({
        Name: "Item 1",
        Price: 150000,
        Quantity: 1,
        Amount: 150000,
        Tax: "none",
        PaymentMethod: "full_payment",
        PaymentObject: "commodity",
      })
      // FFD 1.05 must NOT include FFD 1.2-only fields
      expect(receipt.Items[0].MeasurementUnit).toBeUndefined()
      expect(receipt.Customer).toBeUndefined()
    })

    it("appends a shipping Item when shipping_total > 0", () => {
      const cart = {
        ...baseCart,
        shipping_total: 500,
        shipping_methods: [{ name: "Boxberry" }],
      }
      const receipt: any = generateReceipt("1.05", "osn", "vat20", "vat10", cart)

      expect(receipt.Items).toHaveLength(2)
      expect(receipt.Items[1]).toMatchObject({
        Name: "Boxberry",
        Price: 50000,
        Quantity: 1,
        Amount: 50000,
        Tax: "vat10", // taxShipping (different from item tax)
        PaymentObject: "service",
      })
    })

    it("falls back to default 'Shipping' name when shipping_methods is empty", () => {
      const cart = { ...baseCart, shipping_total: 500, shipping_methods: [] }
      const receipt: any = generateReceipt("1.05", "osn", "none", "none", cart)
      expect(receipt.Items[1].Name).toBe("Shipping")
    })

    it("truncates very long shipping method names to 128 chars with ellipsis", () => {
      const longName = "A".repeat(200)
      const cart = {
        ...baseCart,
        shipping_total: 500,
        shipping_methods: [{ name: longName }],
      }
      const receipt: any = generateReceipt("1.05", "osn", "none", "none", cart)
      expect(receipt.Items[1].Name.length).toBe(126) // 125 + '…'
      expect(receipt.Items[1].Name.endsWith("…")).toBe(true)
    })

    it("formats item Name as 'Product (Variant)' when variant_title is present", () => {
      const cart = {
        ...baseCart,
        items: [
          { product_title: "T-Shirt", variant_title: "Red / L", unit_price: 1000, quantity: 1, total: 1000 },
        ],
      }
      const receipt: any = generateReceipt("1.05", "osn", "none", "none", cart)
      expect(receipt.Items[0].Name).toBe("T-Shirt (Red / L)")
    })

    it("omits Email / Phone if not provided on cart", () => {
      const cart = {
        ...baseCart,
        email: undefined,
        shipping_address: { ...baseCart.shipping_address, phone: undefined },
      }
      const receipt: any = generateReceipt("1.05", "osn", "none", "none", cart)
      expect(receipt.Email).toBeUndefined()
      expect(receipt.Phone).toBeUndefined()
    })
  })

  describe("FFD 1.2", () => {
    it("sets FfdVersion=1.2, Customer from shipping_address, and MeasurementUnit on items", () => {
      const receipt: any = generateReceipt("1.2", "osn", "none", "none", baseCart)

      expect(receipt.FfdVersion).toBe("1.2")
      expect(receipt.Customer).toBe("Петров Иван")
      expect(receipt.Items[0].MeasurementUnit).toBe("шт")
    })

    it("omits Customer when first_name or last_name missing", () => {
      const cart = {
        ...baseCart,
        shipping_address: { phone: "+7", first_name: "", last_name: "" },
      }
      const receipt: any = generateReceipt("1.2", "osn", "none", "none", cart)
      expect(receipt.Customer).toBeUndefined()
    })
  })

  describe("missing shipping_address (defensive)", () => {
    const cartWithoutShipping = {
      email: "buyer@example.com",
      currency_code: "rub",
      shipping_total: 0,
      shipping_methods: [],
      // shipping_address intentionally omitted
      items: [
        { product_title: "Item 1", unit_price: 1500, quantity: 1, total: 1500 },
      ],
    } as any

    it("throws (unwrapped) for FFD 1.05 when shipping_address is absent", () => {
      expect(() => generateReceipt("1.05", "osn", "none", "none", cartWithoutShipping)).toThrow(
        /Cannot read properties of undefined/
      )
    })

    it("throws (unwrapped) for FFD 1.2 when shipping_address is absent", () => {
      expect(() => generateReceipt("1.2", "osn", "none", "none", cartWithoutShipping)).toThrow(
        /Cannot read properties of undefined/
      )
    })
  })
})

describe("generateRefundReceipt", () => {
  const initialFfd105 = {
    FfdVersion: "1.05",
    Taxation: "osn",
    Items: [
      { Name: "Item 1", Price: 150000, Quantity: 1, Amount: 150000, Tax: "none", PaymentMethod: "full_payment", PaymentObject: "commodity" },
      { Name: "Item 2", Price: 50000, Quantity: 2, Amount: 100000, Tax: "none", PaymentMethod: "full_payment", PaymentObject: "commodity" },
    ],
  } as any

  it("collapses initial Items to a single 'Refund for Order <orderId>' line in kopecks", () => {
    const refund: any = generateRefundReceipt(750, "cart_01HX", initialFfd105)

    expect(refund.FfdVersion).toBe("1.05")
    expect(refund.Items).toHaveLength(1)
    expect(refund.Items[0]).toMatchObject({
      Name: "Refund for Order cart_01HX",
      Price: 75000,
      Quantity: 1,
      Amount: 75000,
    })
  })

  it("preserves the existing Tax / PaymentMethod / PaymentObject from the first item", () => {
    const refund: any = generateRefundReceipt(750, "cart_01HX", initialFfd105)
    expect(refund.Items[0].Tax).toBe("none")
    expect(refund.Items[0].PaymentMethod).toBe("full_payment")
    expect(refund.Items[0].PaymentObject).toBe("commodity")
  })

  it("works with FFD 1.2 receipts", () => {
    const initialFfd12 = {
      FfdVersion: "1.2",
      Taxation: "osn",
      Customer: "Петров Иван",
      Items: [
        { Name: "Item 1", Price: 150000, Quantity: 1, Amount: 150000, Tax: "none", PaymentMethod: "full_payment", PaymentObject: "commodity", MeasurementUnit: "шт" },
      ],
    } as any
    const refund: any = generateRefundReceipt(500, "cart_02", initialFfd12)
    expect(refund.FfdVersion).toBe("1.2")
    expect(refund.Items[0].Name).toBe("Refund for Order cart_02")
    expect(refund.Items[0].Amount).toBe(50000)
    expect(refund.Items[0].MeasurementUnit).toBe("шт")
  })
})
