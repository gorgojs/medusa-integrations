import { buildPayPalCartLines, type PayPalCart } from "../cart-items"

const eur = (value: string) => ({ currency_code: "EUR", value })

const cart = (overrides: Partial<PayPalCart> = {}): PayPalCart => ({
  item_subtotal: 30,
  shipping_subtotal: 0,
  tax_total: 0,
  discount_subtotal: 0,
  items: [
    { title: "Medusa T-Shirt", variant_title: "L / White", variant_sku: "SHIRT-L-W", quantity: 2, subtotal: 20 },
    { title: "Medusa Mug", quantity: 1, subtotal: 10 },
  ],
  ...overrides,
})

describe("buildPayPalCartLines", () => {
  it("sends every line with its unit price, and an item total that adds up to the amount", () => {
    expect(buildPayPalCartLines(cart(), "EUR", "30.00")).toEqual({
      items: [
        { name: "Medusa T-Shirt · L / White", quantity: "2", unit_amount: eur("10.00"), sku: "SHIRT-L-W" },
        { name: "Medusa Mug", quantity: "1", unit_amount: eur("10.00") },
      ],
      breakdown: { item_total: eur("30.00") },
    })
  })

  it("adds shipping, tax and discount to the breakdown", () => {
    const lines = buildPayPalCartLines(
      cart({ shipping_subtotal: 6, tax_total: 5.4, discount_subtotal: 3 }),
      "EUR",
      "38.40"
    )
    expect(lines?.breakdown).toEqual({
      item_total: eur("30.00"),
      shipping: eur("6.00"),
      tax_total: eur("5.40"),
      discount: eur("3.00"),
    })
  })

  it("sends a line that does not split into equal unit prices as one unit named with its quantity", () => {
    const lines = buildPayPalCartLines(
      cart({ item_subtotal: 10, items: [{ title: "Sticker", quantity: 3, subtotal: 10 }] }),
      "EUR",
      "10.00"
    )
    expect(lines?.items).toEqual([{ name: "Sticker × 3", quantity: "1", unit_amount: eur("10.00") }])
    expect(lines?.breakdown.item_total).toEqual(eur("10.00"))
  })

  it("formats a currency without decimals as whole numbers", () => {
    const lines = buildPayPalCartLines(
      cart({ item_subtotal: 1500, items: [{ title: "Tea", quantity: 3, subtotal: 1500 }] }),
      "JPY",
      "1500"
    )
    expect(lines?.items[0].unit_amount).toEqual({ currency_code: "JPY", value: "500" })
    expect(lines?.breakdown.item_total).toEqual({ currency_code: "JPY", value: "1500" })
  })

  it("cuts a name to the 127 characters PayPal takes", () => {
    const lines = buildPayPalCartLines(
      cart({ item_subtotal: 5, items: [{ title: "A".repeat(200), quantity: 1, subtotal: 5 }] }),
      "EUR",
      "5.00"
    )
    expect(lines?.items[0].name).toHaveLength(127)
  })

  it("sends nothing when the cart does not add up to the amount, so the order carries the amount alone", () => {
    // A gift card or a payment for part of the total leaves a gap PayPal would reject.
    expect(buildPayPalCartLines(cart(), "EUR", "25.00")).toBeNull()
  })

  it("sends nothing for a cart without items, or no cart at all", () => {
    expect(buildPayPalCartLines(cart({ items: [] }), "EUR", "0.00")).toBeNull()
    expect(buildPayPalCartLines(null, "EUR", "10.00")).toBeNull()
  })

  it("sends nothing for a line with a quantity PayPal cannot take", () => {
    expect(
      buildPayPalCartLines(cart({ items: [{ title: "Cloth", quantity: 1.5, subtotal: 15 }] }), "EUR", "15.00")
    ).toBeNull()
  })
})
