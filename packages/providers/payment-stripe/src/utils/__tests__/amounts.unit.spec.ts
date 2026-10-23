import { MedusaError } from "@medusajs/framework/utils"
import { fromStripeAmount, toStripeAmount } from "../amounts"

describe("toStripeAmount", () => {
  it.each([
    [19.99, "usd", 1999],
    [1234.56, "EUR", 123456],
    ["1.005", "usd", 101],
    [0.1 + 0.2, "usd", 30],
    ["123456789.99", "usd", 12345678999],
  ])("two-decimal %p %s → %p", (amount, currency, expected) => {
    expect(toStripeAmount(amount, currency)).toBe(expected)
  })

  it.each([
    [500, "JPY", 500],
    [500.5, "jpy", 501],
    [5, "KRW", 5],
    [5, "CLP", 5],
    [5, "VND", 5],
  ])("zero-decimal %p %s → %p", (amount, currency, expected) => {
    expect(toStripeAmount(amount, currency)).toBe(expected)
  })

  it.each([
    [5, "UGX", 500],
    [5000, "ugx", 500000],
    [5, "ISK", 500],
    [5.5, "ISK", 600],
  ])("ISK and UGX are whole units sent with 00: %p %s → %p (regression of D2)", (amount, currency, expected) => {
    expect(toStripeAmount(amount, currency)).toBe(expected)
  })

  it.each([
    [1000, "HUF", 100000],
    ["1000.5", "HUF", 100050],
    [800, "TWD", 80000],
  ])("HUF and TWD are charged as two-decimal: %p %s → %p", (amount, currency, expected) => {
    expect(toStripeAmount(amount, currency)).toBe(expected)
  })

  it.each([
    ["5.120", "KWD", 5120],
    ["5.121", "KWD", 5120],
    ["5.124", "KWD", 5120],
    ["5.125", "KWD", 5130],
    ["5.129", "kwd", 5130],
    [10, "BHD", 10000],
    ["1.234", "JOD", 1230],
    ["2.345", "OMR", 2350],
    ["3.999", "TND", 4000],
  ])("three-decimal rounds to the nearest ten: %p %s → %p (regression of D3)", (amount, currency, expected) => {
    expect(toStripeAmount(amount, currency)).toBe(expected)
  })

  it.each([[-1], [Number.NaN], [Number.POSITIVE_INFINITY]])("refuses %p", (amount) => {
    expect(() => toStripeAmount(amount, "usd")).toThrow(MedusaError)
  })
})

describe("fromStripeAmount", () => {
  it.each([
    [1999, "usd", 19.99],
    [501, "JPY", 501],
    [500, "UGX", 5],
    [600, "ISK", 6],
    [100050, "HUF", 1000.5],
    [5130, "KWD", 5.13],
    [4000, "TND", 4],
  ])("%p %s → %p", (amount, currency, expected) => {
    expect(fromStripeAmount(amount, currency)).toBe(expected)
  })

  it.each(["usd", "JPY", "UGX", "KWD"])("is the inverse of toStripeAmount for %s", (currency) => {
    const minor = toStripeAmount(42, currency)
    expect(fromStripeAmount(minor, currency)).toBe(42)
  })
})
