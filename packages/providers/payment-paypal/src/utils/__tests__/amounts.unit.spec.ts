import { BigNumber, MathBN, MedusaError } from "@medusajs/framework/utils"
import { formatAmount, getCurrencyExponent } from "../amounts"

describe("getCurrencyExponent", () => {
  it.each([
    ["HUF", 0],
    ["JPY", 0],
    ["TWD", 0],
    ["huf", 0],
    ["BHD", 3],
    ["KWD", 3],
    ["EUR", 2],
    ["USD", 2],
  ])("%s -> %s decimals", (currency, expected) => {
    expect(getCurrencyExponent(currency)).toBe(expected)
  })
})

describe("formatAmount", () => {
  it("sends HUF, JPY and TWD without a decimal part, as PayPal requires", () => {
    expect(formatAmount(1000, "HUF")).toBe("1000")
    expect(formatAmount(1500, "JPY")).toBe("1500")
    expect(formatAmount(99.99, "TWD")).toBe("100")
    expect(formatAmount(1000.5, "HUF")).toBe("1001")
  })

  it("keeps three decimals for BHD", () => {
    expect(formatAmount(1.2345, "BHD")).toBe("1.235")
    expect(formatAmount(12, "BHD")).toBe("12.000")
  })

  it("formats two-decimal currencies in major units", () => {
    expect(formatAmount(10, "EUR")).toBe("10.00")
    expect(formatAmount("19.9", "usd")).toBe("19.90")
  })

  it("rounds in decimal arithmetic, not binary floating point", () => {
    // Number(1.005).toFixed(2) is "1.00"
    expect(formatAmount(1.005, "EUR")).toBe("1.01")
    expect(formatAmount(MathBN.add(0.1, 0.2), "EUR")).toBe("0.30")
  })

  it("keeps every digit of large amounts", () => {
    expect(formatAmount("12345678901234567890.125", "EUR")).toBe("12345678901234567890.13")
  })

  it("accepts Medusa BigNumber values in every form", () => {
    expect(formatAmount(new BigNumber(42.5), "EUR")).toBe("42.50")
    expect(formatAmount({ value: "20", precision: 20 }, "EUR")).toBe("20.00")
  })

  it.each([["abc"], [-1], [Number.NaN]])("rejects %s with INVALID_DATA", (amount) => {
    expect(() => formatAmount(amount as any, "EUR")).toThrow(MedusaError)
    try {
      formatAmount(amount as any, "EUR")
    } catch (error) {
      expect((error as MedusaError).type).toBe(MedusaError.Types.INVALID_DATA)
    }
  })
})
