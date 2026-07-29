import ApishipIntegrationProvider from "../services/apiship-integration"
import { collectValidationIssues } from "@gorgo/medusa-integration"

const descriptor = new ApishipIntegrationProvider().descriptor
const schema = descriptor.optionsSchema

const validBase = {
  token: "test-token",
}

const validationPaths = (input: Record<string, unknown>): string[] =>
  collectValidationIssues(descriptor, input).map((i) => i.path)

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
        expect(res.data.settings).toEqual({
          connections: [],
          default_sender_settings: { country_code: "", address_string: "", contact_name: "", phone: "" },
          default_product_sizes: { length: 10, width: 10, height: 10, weight: 20 },
          delivery_cost_vat: -1,
          is_cod: false,
        })
      }
    })
  })

  describe("full validation", () => {
    it("is complete with only the required token set", () => {
      expect(validationPaths(validBase)).toEqual([])
    })

    it("accepts a fully-populated settings blob", () => {
      expect(
        validationPaths({
          ...validBase,
          is_test: true,
          settings: {
            connections: [
              { id: "ascon_1", name: "CDEK", provider_key: "cdek", provider_connect_id: "123", is_enabled: true },
            ],
            default_sender_settings: { country_code: "RU", address_string: "Moscow", contact_name: "Ivan", phone: "+79001234567" },
            default_product_sizes: { length: 10, width: 10, height: 10, weight: 20 },
            delivery_cost_vat: -1,
            is_cod: false,
          },
        })
      ).toEqual([])
    })
  })
})
