import { formatCurrency, getCurrencyDecimals, getCurrencyMultiplier } from "../format-currency"

describe("getCurrencyDecimals", () => {
  it("returns 2 for standard currencies (RUB, USD, EUR)", () => {
    expect(getCurrencyDecimals("RUB")).toBe(2)
    expect(getCurrencyDecimals("USD")).toBe(2)
    expect(getCurrencyDecimals("EUR")).toBe(2)
  })

  it("is case-insensitive", () => {
    expect(getCurrencyDecimals("rub")).toBe(2)
    expect(getCurrencyDecimals("jpy")).toBe(0)
    expect(getCurrencyDecimals("bhd")).toBe(3)
  })

  it("returns 0 for zero-decimal currencies (JPY, KRW, VND)", () => {
    expect(getCurrencyDecimals("JPY")).toBe(0)
    expect(getCurrencyDecimals("KRW")).toBe(0)
    expect(getCurrencyDecimals("VND")).toBe(0)
  })

  it("returns 3 for three-decimal currencies (BHD, KWD, OMR)", () => {
    expect(getCurrencyDecimals("BHD")).toBe(3)
    expect(getCurrencyDecimals("KWD")).toBe(3)
    expect(getCurrencyDecimals("OMR")).toBe(3)
  })
})

describe("getCurrencyMultiplier", () => {
  it("returns 100 for 2-decimal currencies", () => {
    expect(getCurrencyMultiplier("RUB")).toBe(100)
  })

  it("returns 1 for 0-decimal currencies", () => {
    expect(getCurrencyMultiplier("JPY")).toBe(1)
  })

  it("returns 1000 for 3-decimal currencies", () => {
    expect(getCurrencyMultiplier("BHD")).toBe(1000)
  })
})

describe("formatCurrency", () => {
  describe("2-decimal currencies (RUB, USD)", () => {
    it.each<[number | string, string]>([
      [1500, "1500.00"],
      [1500.99, "1500.99"],
      [0, "0.00"],
      ["750", "750.00"],
      ["1500.5", "1500.50"],
    ])("RUB %s → %s", (input, expected) => {
      expect(formatCurrency(input, "RUB")).toBe(expected)
    })

    it("handles comma as decimal separator", () => {
      expect(formatCurrency("1500,50", "RUB")).toBe("1500.50")
    })
  })

  describe("0-decimal currencies (JPY, KRW)", () => {
    it.each<[string, number | string, string]>([
      ["JPY", 1500, "1500"],
      ["KRW", 1500, "1500"],
      ["JPY", "999", "999"],
    ])("%s %s → %s", (currency, input, expected) => {
      expect(formatCurrency(input, currency)).toBe(expected)
    })
  })

  describe("3-decimal currencies (BHD)", () => {
    it.each<[number | string, string]>([
      [1.234, "1.234"],
      [1.0, "1.000"],
      [0.001, "0.001"],
    ])("BHD %s → %s", (input, expected) => {
      expect(formatCurrency(input, "BHD")).toBe(expected)
    })
  })

  it("handles bigint input", () => {
    expect(formatCurrency(BigInt(1500), "RUB")).toBe("1500.00")
  })
})
