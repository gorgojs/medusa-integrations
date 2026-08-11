import {
  APISHIP_DEFAULTS,
  assembleApishipOptions,
  assertApishipToken,
} from "../apiship-options"
import ApishipIntegrationProvider from "../../providers/integration-apiship/services/apiship-integration"

const schema = new ApishipIntegrationProvider().descriptor.optionsSchema

describe("assembleApishipOptions", () => {
  describe("credentials", () => {
    it("falls back to an empty token instead of throwing (admin drafts)", () => {
      expect(assembleApishipOptions({ is_test: false }).token).toBe("")
      expect(assembleApishipOptions(undefined).token).toBe("")
    })

    it("defaults is_test to false and preserves an explicit value", () => {
      expect(assembleApishipOptions({ token: "tok" }).is_test).toBe(false)
      expect(assembleApishipOptions({ token: "tok", is_test: true }).is_test).toBe(true)
    })
  })

  describe("connections", () => {
    it("lifts the list out of the settings blob", () => {
      const result = assembleApishipOptions({
        token: "tok",
        settings: {
          connections: [
            { id: "c1", name: "n1", provider_key: "cdek", provider_connect_id: "p1", is_enabled: true },
          ],
        },
      })

      expect(result.connections).toHaveLength(1)
      expect(result.connections[0].provider_key).toBe("cdek")
    })

    it("strips connections missing a field the order mapping needs", () => {
      const result = assembleApishipOptions({
        token: "tok",
        settings: {
          connections: [
            { id: "c1", name: "n1", provider_key: "cdek", provider_connect_id: "p1", is_enabled: true },
            // missing id
            { name: "n2", provider_key: "cdek", provider_connect_id: "p2", is_enabled: true },
            // missing provider_key
            { id: "c3", name: "n3", provider_connect_id: "p3", is_enabled: true },
            // missing provider_connect_id
            { id: "c4", name: "n4", provider_key: "cdek", is_enabled: true },
            // missing is_enabled
            { id: "c5", name: "n5", provider_key: "cdek", provider_connect_id: "p5" },
          ],
        },
      })

      expect(result.connections.map((c) => c.id)).toEqual(["c1"])
    })

    it("keeps a nameless connection — `name` is optional on create", () => {
      const result = assembleApishipOptions({
        token: "tok",
        settings: {
          connections: [
            { id: "c1", provider_key: "cdek", provider_connect_id: "p1", is_enabled: true },
          ],
        },
      })

      expect(result.connections).toHaveLength(1)
      expect(result.connections[0].name).toBeUndefined()
    })

    it("is an empty array when the blob is absent", () => {
      expect(assembleApishipOptions({ token: "tok" }).connections).toEqual([])
    })
  })

  describe("VAT rate", () => {
    it("passes the stored number through", () => {
      expect(assembleApishipOptions({ token: "tok", delivery_cost_vat: 20 }).delivery_cost_vat).toBe(20)
      expect(assembleApishipOptions({ token: "tok", delivery_cost_vat: 0 }).delivery_cost_vat).toBe(0)
    })

    it("falls back to no-VAT when unset", () => {
      expect(assembleApishipOptions({ token: "tok" }).delivery_cost_vat).toBe(-1)
    })

    // The option is a numeric enum, so the string-to-number coercion belongs to the
    // descriptor's schema (a `<Select>` submits a string), not here.
    it("is coerced by the descriptor when it arrives as a string", () => {
      const parsed = schema.safeParse({ token: "tok", delivery_cost_vat: "20" })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(assembleApishipOptions(parsed.data as any).delivery_cost_vat).toBe(20)
      }
    })

    it("is rejected by the descriptor when it is not a supported rate", () => {
      expect(schema.safeParse({ token: "tok", delivery_cost_vat: 18 }).success).toBe(false)
      expect(schema.safeParse({ token: "tok", delivery_cost_vat: "18" }).success).toBe(false)
    })
  })

  describe("defaults", () => {
    it("applies APISHIP_DEFAULTS to an unvalidated draft", () => {
      const result = assembleApishipOptions({ token: "tok" })

      expect(result.is_cod).toBe(APISHIP_DEFAULTS.is_cod)
      expect(result.default_product_length).toBe(APISHIP_DEFAULTS.default_product_length)
      expect(result.default_product_width).toBe(APISHIP_DEFAULTS.default_product_width)
      expect(result.default_product_height).toBe(APISHIP_DEFAULTS.default_product_height)
      expect(result.default_product_weight).toBe(APISHIP_DEFAULTS.default_product_weight)
    })

    it("preserves explicit values", () => {
      const result = assembleApishipOptions({
        token: "tok",
        is_cod: true,
        default_product_length: 30,
        default_product_width: 20,
        default_product_height: 15,
        default_product_weight: 500,
      })

      expect(result.is_cod).toBe(true)
      expect(result.default_product_length).toBe(30)
      expect(result.default_product_weight).toBe(500)
    })

    // The descriptor declares these defaults from the same const, so a resolved config (schema
    // applied) and an admin draft (schema not applied) must agree. This guards the drift.
    it("matches what the descriptor's schema produces", () => {
      const parsed = schema.safeParse({ token: "tok" })
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      expect(assembleApishipOptions(parsed.data as any)).toEqual(
        assembleApishipOptions({ token: "tok" })
      )
    })
  })

  describe("sender", () => {
    it("reads the flat options", () => {
      const result = assembleApishipOptions({
        token: "tok",
        sender_country_code: "RU",
        sender_address_string: "Москва, Тверская, 1",
        sender_contact_name: "Иван Иванов",
        sender_phone: "+79001234567",
      })

      expect(result.sender_country_code).toBe("RU")
      expect(result.sender_address_string).toBe("Москва, Тверская, 1")
      expect(result.sender_contact_name).toBe("Иван Иванов")
      expect(result.sender_phone).toBe("+79001234567")
    })

    it("leaves unset fields empty — they have no meaningful default", () => {
      const result = assembleApishipOptions({ token: "tok" })

      expect(result.sender_country_code).toBe("")
      expect(result.sender_address_string).toBe("")
      expect(result.sender_contact_name).toBe("")
      expect(result.sender_phone).toBe("")
    })
  })
})

describe("assertApishipToken", () => {
  it.each([undefined, "", "   "])("throws for token %p", (token) => {
    expect(() => assertApishipToken({ token: token as string })).toThrow(/token/i)
  })

  it("passes for a real token", () => {
    expect(() => assertApishipToken({ token: "tok" })).not.toThrow()
  })
})
