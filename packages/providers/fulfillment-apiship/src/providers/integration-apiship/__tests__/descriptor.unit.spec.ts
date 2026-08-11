import ApishipIntegrationProvider from "../services/apiship-integration"
import { collectValidationIssues } from "@gorgo/medusa-integration"
import { APISHIP_DEFAULTS } from "../../../lib/apiship-options"

const descriptor = new ApishipIntegrationProvider().descriptor
const schema = descriptor.optionsSchema

const validBase = {
  token: "test-token",
}

const validationPaths = (input: Record<string, unknown>): string[] =>
  collectValidationIssues(descriptor, input).map((i) => i.path)

const section = (id: string) => descriptor.sections.find((s) => s.id === id)

describe("Apiship integration descriptor schema", () => {
  describe("required credentials (structural)", () => {
    it("rejects a missing token", () => {
      const res = schema.safeParse({ ...validBase, token: undefined })
      expect(res.success).toBe(false)
    })

    it("rejects an empty token", () => {
      const res = schema.safeParse({ ...validBase, token: "" })
      expect(res.success).toBe(false)
    })

    it("accepts minimal valid options and applies defaults", () => {
      const res = schema.safeParse(validBase)
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.is_test).toBe(false)
        // The blob only defaults what it still owns — the connection list.
        expect(res.data.settings).toEqual({ connections: [] })
      }
    })
  })

  describe("sections", () => {
    it("renders payment & VAT and default product sizes in the side column", () => {
      expect(section("payment_and_tax")).toMatchObject({
        column: "side",
        options: ["is_cod", "delivery_cost_vat"],
      })
      expect(section("default_product_sizes")).toMatchObject({
        column: "side",
        options: [
          "default_product_length",
          "default_product_width",
          "default_product_height",
          "default_product_weight",
        ],
      })
    })

    it("renders the sender in the main column", () => {
      expect(section("sender")).toMatchObject({
        options: [
          "sender_country_code",
          "sender_address_string",
          "sender_contact_name",
          "sender_phone",
        ],
      })
      expect(section("sender")?.column).toBeUndefined()
    })

    it("references only declared options", () => {
      for (const s of descriptor.sections) {
        for (const id of s.options) {
          expect(descriptor.options).toHaveProperty(id)
        }
      }
    })

    it("leaves only the connection list to the widget", () => {
      const inSections = new Set(descriptor.sections.flatMap((s) => [...s.options]))
      const notInAnySection = Object.keys(descriptor.options).filter((id) => !inSections.has(id))
      expect(notInAnySection).toEqual(["settings"])
    })
  })

  describe("sender", () => {
    it("accepts an upper-case ISO 3166-1 alpha-2 country", () => {
      expect(schema.safeParse({ ...validBase, sender_country_code: "RU" }).success).toBe(true)
    })

    it("rejects a country that isn't in the list", () => {
      // Lower case is what the old combobox rendered — it persisted upper case.
      expect(schema.safeParse({ ...validBase, sender_country_code: "ru" }).success).toBe(false)
      expect(schema.safeParse({ ...validBase, sender_country_code: "XX" }).success).toBe(false)
    })

    it("accepts the free-form fields", () => {
      expect(
        schema.safeParse({
          ...validBase,
          sender_address_string: "Москва, Тверская, 1",
          sender_contact_name: "Иван Иванов",
          sender_phone: "+79001234567",
        }).success
      ).toBe(true)
    })
  })

  describe("defaults", () => {
    // One source of truth: the descriptor declares them from APISHIP_DEFAULTS, so the
    // resolver, the admin form and the read-only card can't disagree.
    it.each(Object.entries(APISHIP_DEFAULTS))("%s is declared from APISHIP_DEFAULTS", (id, value) => {
      expect((descriptor.options as any)[id].default).toBe(value)
    })

    it("applies them when the option is unset", () => {
      const res = schema.safeParse(validBase)
      expect(res.success).toBe(true)
      if (res.success) {
        for (const [id, value] of Object.entries(APISHIP_DEFAULTS)) {
          expect((res.data as any)[id]).toBe(value)
        }
      }
    })

    // The sender has no meaningful default — an empty string is "not filled in", and
    // `assertOrderOptions_` is what rejects it at order time.
    it.each([
      "sender_country_code",
      "sender_address_string",
      "sender_contact_name",
      "sender_phone",
    ])("%s carries no default", (id) => {
      expect((descriptor.options as any)[id].default).toBeUndefined()

      const res = schema.safeParse(validBase)
      if (res.success) expect((res.data as any)[id]).toBeUndefined()
    })
  })

  describe("payment & VAT", () => {
    it("accepts every ApiShip VAT rate as the number its API expects", () => {
      for (const rate of [-1, 0, 5, 7, 10, 20, 22]) {
        const res = schema.safeParse({ ...validBase, delivery_cost_vat: rate })
        expect(res.success).toBe(true)
        if (res.success) expect(res.data.delivery_cost_vat).toBe(rate)
      }
    })

    // A `<Select>` submits a string, so the option coerces it back to the declared number.
    it("coerces a rate submitted as a string", () => {
      const res = schema.safeParse({ ...validBase, delivery_cost_vat: "20" })
      expect(res.success).toBe(true)
      if (res.success) expect(res.data.delivery_cost_vat).toBe(20)
    })

    it("rejects a rate ApiShip doesn't support, as number or string", () => {
      expect(schema.safeParse({ ...validBase, delivery_cost_vat: 18 }).success).toBe(false)
      expect(schema.safeParse({ ...validBase, delivery_cost_vat: "18" }).success).toBe(false)
    })

    it("only shows the VAT rate when cash on delivery is on", () => {
      expect((descriptor.options as any).delivery_cost_vat.visibleWhen).toEqual({
        field: "is_cod",
        equals: true,
      })
    })
  })

  describe("default product sizes", () => {
    it("accepts positive numbers", () => {
      expect(
        schema.safeParse({
          ...validBase,
          default_product_length: 30,
          default_product_width: 20,
          default_product_height: 15,
          default_product_weight: 500,
        }).success
      ).toBe(true)
    })

    it.each([0, -5])("rejects %p", (v) => {
      expect(schema.safeParse({ ...validBase, default_product_length: v }).success).toBe(false)
    })

    it("re-applies the default when a field is cleared (the number control sends null)", () => {
      const res = schema.safeParse({ ...validBase, default_product_weight: null })
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.data.default_product_weight).toBe(APISHIP_DEFAULTS.default_product_weight)
      }
    })
  })

  describe("full validation", () => {
    it("is complete with only the required token set", () => {
      expect(validationPaths(validBase)).toEqual([])
    })

    it("accepts a fully-populated config", () => {
      expect(
        validationPaths({
          ...validBase,
          is_test: true,
          is_cod: true,
          delivery_cost_vat: "20",
          default_product_length: 10,
          default_product_width: 10,
          default_product_height: 10,
          default_product_weight: 20,
          sender_country_code: "RU",
          sender_address_string: "Moscow",
          sender_contact_name: "Ivan",
          sender_phone: "+79001234567",
          settings: {
            connections: [
              { id: "ascon_1", name: "CDEK", provider_key: "cdek", provider_connect_id: "123", is_enabled: true },
            ],
          },
        })
      ).toEqual([])
    })

  })
})
