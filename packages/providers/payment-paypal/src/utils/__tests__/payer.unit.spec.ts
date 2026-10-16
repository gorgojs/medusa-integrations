import { toPayPalPayer } from "../payer"

const approved = {
  id: "ORDER-1",
  status: "APPROVED",
  payer: {
    email_address: "buyer@example.com",
    name: { given_name: "Anna", surname: "Smith" },
    phone: { phone_number: { national_number: "4085551234" } },
  },
  purchase_units: [
    {
      reference_id: "pay_col_1",
      amount: { currency_code: "EUR", value: "10.00" },
      shipping: {
        name: { full_name: "Jan van der Berg" },
        address: {
          address_line_1: "Damrak 1",
          address_line_2: "2nd floor",
          admin_area_2: "Amsterdam",
          admin_area_1: "NH",
          postal_code: "1012 LG",
          country_code: "NL",
        },
      },
    },
  ],
} as any

describe("toPayPalPayer", () => {
  it("turns the approved order into a Medusa contact and address", () => {
    expect(toPayPalPayer(approved)).toEqual({
      amount: { currency_code: "EUR", value: "10.00" },
      email: "buyer@example.com",
      phone: "4085551234",
      shipping_address: {
        first_name: "Jan",
        last_name: "van der Berg",
        address_1: "Damrak 1",
        address_2: "2nd floor",
        city: "Amsterdam",
        province: "NH",
        postal_code: "1012 LG",
        country_code: "nl",
        phone: "4085551234",
      },
    })
  })

  it("falls back to the payer's name when the shipping name is missing", () => {
    const order = {
      ...approved,
      purchase_units: [{ shipping: { address: { country_code: "DE" } } }],
    }

    expect(toPayPalPayer(order).shipping_address).toMatchObject({ first_name: "Anna", last_name: "Smith", country_code: "de" })
  })

  it("keeps a one-word shipping name as the first name", () => {
    const order = {
      ...approved,
      purchase_units: [{ shipping: { name: { full_name: "Cher" }, address: { country_code: "US" } } }],
    }

    expect(toPayPalPayer(order).shipping_address).toMatchObject({ first_name: "Cher", last_name: null })
  })

  it("has no address when the order ships nothing", () => {
    expect(toPayPalPayer({ id: "ORDER-1", purchase_units: [{}] } as any)).toEqual({
      amount: null,
      email: null,
      phone: null,
      shipping_address: null,
    })
  })
})
