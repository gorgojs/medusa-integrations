import { BigNumber, MathBN } from "@medusajs/framework/utils"
import { fromAnetAmount, toAnetAmount } from "../amounts"

describe("toAnetAmount", () => {
  it.each([
    [10, "USD", "10.00"],
    [10.5, "usd", "10.50"],
    [2.675, "USD", "2.68"],
    [2.674, "USD", "2.67"],
    [0.005, "EUR", "0.01"],
    [0, "USD", "0.00"],
    [123456789.99, "USD", "123456789.99"],
    [500, "JPY", "500"],
    [500.5, "JPY", "501"],
  ])("formats %p %s as %p", (amount, currency, expected) => {
    expect(toAnetAmount(amount, currency)).toBe(expected)
  })

  it("keeps decimal arithmetic exact", () => {
    expect(toAnetAmount(MathBN.add(0.1, 0.2), "USD")).toBe("0.30")
  })

  it("accepts Medusa's BigNumber and raw values", () => {
    expect(toAnetAmount(new BigNumber(19.99), "USD")).toBe("19.99")
    expect(toAnetAmount({ value: "19.995", precision: 20 } as any, "USD")).toBe("20.00")
    expect(toAnetAmount("42.1", "CAD")).toBe("42.10")
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rejects %p", (amount) => {
    expect(() => toAnetAmount(amount, "USD")).toThrow("Invalid Authorize.net amount")
  })
})

describe("fromAnetAmount", () => {
  it.each([
    ["10.00", 10],
    ["2.68", 2.68],
    [19.99, 19.99],
    ["500", 500],
  ])("reads %p as %p", (value, expected) => {
    expect(fromAnetAmount(value)).toBe(expected)
  })

  it("is the inverse of toAnetAmount", () => {
    for (const [amount, currency] of [
      [10.5, "USD"],
      [0.3, "EUR"],
      [500, "JPY"],
    ] as const) {
      expect(fromAnetAmount(toAnetAmount(amount, currency))).toBe(amount)
    }
  })

  it.each([undefined, null, ""])("returns undefined for %p", (value) => {
    expect(fromAnetAmount(value as any)).toBeUndefined()
  })
})
