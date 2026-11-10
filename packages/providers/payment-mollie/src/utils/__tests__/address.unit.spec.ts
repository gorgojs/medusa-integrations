import { toMollieAddress } from "../address"

const ADDRESS = {
  first_name: "Jan",
  last_name: "Jansen",
  company: "",
  address_1: "Keizersgracht 126",
  address_2: "2e verdieping",
  city: "Amsterdam",
  province: " ",
  postal_code: "1015 CW",
  country_code: "nl",
  phone: "06 12345678",
}

describe("toMollieAddress", () => {
  it("maps a complete address and the email, without empty fields or the phone", () => {
    expect(toMollieAddress(ADDRESS, "jan@example.com")).toEqual({
      givenName: "Jan",
      familyName: "Jansen",
      streetAndNumber: "Keizersgracht 126",
      streetAdditional: "2e verdieping",
      postalCode: "1015 CW",
      city: "Amsterdam",
      country: "NL",
      email: "jan@example.com",
    })
  })

  it.each(["address_1", "postal_code", "city", "country_code"])("leaves out an address without %s", (field) => {
    expect(toMollieAddress({ ...ADDRESS, [field]: "" })).toBeUndefined()
    expect(toMollieAddress({ ...ADDRESS, [field]: null })).toBeUndefined()
  })

  it("leaves out no address at all", () => {
    expect(toMollieAddress(null, "jan@example.com")).toBeUndefined()
    expect(toMollieAddress(undefined)).toBeUndefined()
  })
})
