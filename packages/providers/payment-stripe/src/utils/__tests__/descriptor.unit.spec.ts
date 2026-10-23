import { statementDescriptorSuffixError } from "../descriptor"

describe("statementDescriptorSuffixError", () => {
  it.each(["ORDER", "Shop 42", "RUNCLUB-7"])("accepts %p", (value) => {
    expect(statementDescriptorSuffixError(value)).toBeNull()
  })

  it.each([
    ["A".repeat(23), "at most 22"],
    ["Заказ", "Latin"],
    ["12345", "letter"],
    ["SHOP*1", "no <"],
    ['SHOP"1', "no <"],
    ["SHOP<1", "no <"],
  ])("refuses %p", (value, reason) => {
    expect(statementDescriptorSuffixError(value)).toContain(reason)
  })
})
