import { MedusaError } from "@medusajs/framework/utils"
import {
  assertPayPalCurrency,
  isInCountryOnlyCurrency,
  isPayPalCurrency,
  PAYPAL_CURRENCIES,
} from "../currencies"

describe("PayPal currencies", () => {
  it("lists the 25 currencies from the PayPal reference", () => {
    expect(PAYPAL_CURRENCIES).toHaveLength(25)
  })

  it.each(["USD", "eur", "JPY", "CNY", "RUB"])("accepts %s", (code) => {
    expect(isPayPalCurrency(code)).toBe(true)
  })

  it.each(["KRW", "BHD", "UAH"])("rejects %s", (code) => {
    expect(isPayPalCurrency(code)).toBe(false)
  })

  it("marks BRL, CNY and MYR as in-country only", () => {
    expect(isInCountryOnlyCurrency("brl")).toBe(true)
    expect(isInCountryOnlyCurrency("CNY")).toBe(true)
    expect(isInCountryOnlyCurrency("MYR")).toBe(true)
    expect(isInCountryOnlyCurrency("EUR")).toBe(false)
  })

  it("returns the upper-cased code for a supported currency", () => {
    expect(assertPayPalCurrency("usd")).toBe("USD")
  })

  it("throws INVALID_DATA for an unsupported currency", () => {
    expect(() => assertPayPalCurrency("krw")).toThrow("PayPal does not support the currency KRW")
    try {
      assertPayPalCurrency("krw")
    } catch (error) {
      expect((error as MedusaError).type).toBe(MedusaError.Types.INVALID_DATA)
    }
  })
})
