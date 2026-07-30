import { getSmallestUnit, getAmountFromSmallestUnit } from "../get-smallest-unit"

describe("getSmallestUnit", () => {
  describe("2-decimal currencies (default, e.g. RUB/USD/EUR)", () => {
    it.each<[number | string, number]>([
      [1500, 150000],
      [1, 100],
      [0, 0],
      [1500.99, 150099],
      ["750", 75000],
    ])("RUB %s -> %s kopecks", (input, expected) => {
      expect(getSmallestUnit(input, "RUB")).toBe(expected)
    })

    it("is case-insensitive on currency code", () => {
      expect(getSmallestUnit(1500, "rub")).toBe(150000)
      expect(getSmallestUnit(1500, "RuB")).toBe(150000)
    })
  })

  describe("0-decimal currencies (JPY/KRW/...)", () => {
    it.each<[string, number, number]>([
      ["JPY", 1500, 1500],
      ["KRW", 1500, 1500],
      ["VND", 999, 999],
    ])("%s %s -> %s", (currency, input, expected) => {
      expect(getSmallestUnit(input, currency)).toBe(expected)
    })
  })

  describe("3-decimal currencies — rounded up to nearest 10", () => {
    // Per the implementation, 3-decimal currencies are rounded up to the
    // nearest 10 units (a T-Kassa / general acquirer constraint).
    it.each<[string, number, number]>([
      ["BHD", 1.234, 1240],
      ["BHD", 1.000, 1000],
      ["KWD", 0.001, 10],
      ["OMR", 1.005, 1010],
    ])("%s %s -> %s", (currency, input, expected) => {
      expect(getSmallestUnit(input, currency)).toBe(expected)
    })
  })
})

describe("getAmountFromSmallestUnit", () => {
  it.each<[string, number, number]>([
    ["RUB", 150000, 1500],
    ["RUB", 0, 0],
    ["JPY", 1500, 1500],
    ["BHD", 1000, 1],
  ])("%s %s smallest unit -> %s standard", (currency, input, expected) => {
    expect(getAmountFromSmallestUnit(input, currency)).toBe(expected)
  })

  it("is case-insensitive on currency code", () => {
    expect(getAmountFromSmallestUnit(150000, "rub")).toBe(1500)
  })
})
