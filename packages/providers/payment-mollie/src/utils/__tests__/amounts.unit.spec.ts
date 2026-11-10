import { fromMollieAmount, sameMollieAmount, toMollieAmount } from "../amounts"

describe("toMollieAmount", () => {
  it.each([
    [1000, "jpy", "JPY", "1000"],
    [99.5, "isk", "ISK", "100"],
    [1000, "huf", "HUF", "1000.00"],
    [10.5, "eur", "EUR", "10.50"],
    [0.005, "eur", "EUR", "0.01"],
    [19.994, "usd", "USD", "19.99"],
    ["12.3", "gbp", "GBP", "12.30"],
    [0, "eur", "EUR", "0.00"],
  ])("formats %s %s as %s %s", (amount, currency, expectedCurrency, expectedValue) => {
    expect(toMollieAmount(amount, currency)).toEqual({ currency: expectedCurrency, value: expectedValue })
  })

  it("takes Medusa's raw BigNumber shape", () => {
    expect(toMollieAmount({ value: "25.1", precision: 20 } as any, "eur")).toEqual({ currency: "EUR", value: "25.10" })
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rejects %s", (amount) => {
    expect(() => toMollieAmount(amount, "eur")).toThrow("Invalid Mollie amount")
  })
})

describe("fromMollieAmount", () => {
  it("reads Mollie's amount object and bare values", () => {
    expect(fromMollieAmount({ value: "10.00" })).toBe(10)
    expect(fromMollieAmount("1000")).toBe(1000)
    expect(fromMollieAmount(5.5)).toBe(5.5)
  })

  it("returns undefined for nothing", () => {
    expect(fromMollieAmount(undefined)).toBeUndefined()
    expect(fromMollieAmount(null)).toBeUndefined()
    expect(fromMollieAmount({ value: "" })).toBeUndefined()
  })
})

describe("sameMollieAmount", () => {
  it("compares amounts as Mollie formats them", () => {
    expect(sameMollieAmount(10, "10.001", "eur")).toBe(true)
    expect(sameMollieAmount(10, 10.01, "eur")).toBe(false)
    expect(sameMollieAmount(1000, 1000.4, "jpy")).toBe(true)
  })
})
