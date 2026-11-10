import { MOLLIE_LOCALES, toMollieLocale } from "../locale"

describe("toMollieLocale", () => {
  it.each([
    ["de", "de_DE"],
    ["en", "en_US"],
    ["no", "nb_NO"],
    ["nl_BE", "nl_BE"],
    ["nl-BE", "nl_BE"],
    ["fr-be", "fr_BE"],
    ["EN_gb", "en_GB"],
    ["de-RU", "de_DE"],
  ])("reads %s as %s", (value, expected) => {
    expect(toMollieLocale(value)).toBe(expected)
  })

  it.each(["ru", "xx", "", "  ", undefined, 42])("leaves %s to the browser", (value) => {
    expect(toMollieLocale(value)).toBeUndefined()
  })

  it("only produces locales Mollie takes", () => {
    const known = new Set<string>(MOLLIE_LOCALES)
    for (const language of ["ca", "cs", "da", "de", "el", "en", "es", "fi", "fr", "hu", "is", "it", "lt", "lv", "nb", "no", "nl", "pl", "pt", "sk", "sl", "sv", "tr"]) {
      expect(known.has(toMollieLocale(language)!)).toBe(true)
    }
  })
})
