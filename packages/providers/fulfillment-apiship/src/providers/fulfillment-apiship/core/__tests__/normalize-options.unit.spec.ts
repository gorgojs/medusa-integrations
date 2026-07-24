jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track: () => {} }),
}))

jest.mock("../../../../workflows", () => ({
  getApishipClientConfigWorkflow: jest.fn(),
  getApishipOptionsWorkflow: jest.fn(),
  getCalculationWorkflow: jest.fn(),
  saveCalculationWorkflow: jest.fn(),
  getStockLocationWorkflow: jest.fn(),
  getShippingOptionWorkflow: jest.fn(),
}))

jest.mock("../../../../lib/client", () => ({
  createApishipClient: jest.fn(),
}))

import ApishipService from "../../services/apiship"
import { makeLogger } from "./test-utils"

describe("ApishipBase.normalizeApishipOptions_ (private helper, accessed via (instance as any))", () => {
  let service: any

  beforeEach(() => {
    service = new (ApishipService as any)({ logger: makeLogger() }, {})
  })

  describe("required field validation", () => {
    it("throws when token is missing", () => {
      expect(() =>
        service.normalizeApishipOptions_({ is_test: false })
      ).toThrow(/token/)
    })

    it("throws when token is an empty string", () => {
      expect(() =>
        service.normalizeApishipOptions_({ token: "", is_test: false })
      ).toThrow(/token/)
    })

    it("throws when token is whitespace only", () => {
      expect(() =>
        service.normalizeApishipOptions_({ token: "   ", is_test: false })
      ).toThrow(/token/)
    })

    it("throws when is_test is undefined", () => {
      expect(() =>
        service.normalizeApishipOptions_({ token: "tok" })
      ).toThrow(/is_test/)
    })

    it("accepts is_test=true", () => {
      expect(() =>
        service.normalizeApishipOptions_({ token: "tok", is_test: true })
      ).not.toThrow()
    })

    it("accepts is_test=false", () => {
      expect(() =>
        service.normalizeApishipOptions_({ token: "tok", is_test: false })
      ).not.toThrow()
    })
  })

  describe("connections normalization", () => {
    it("strips connections with missing required fields", () => {
      const result = service.normalizeApishipOptions_({
        token: "tok",
        is_test: true,
        settings: {
          connections: [
            // valid connection
            { id: "c1", name: "n1", provider_key: "cdek", provider_connect_id: "p1", is_enabled: true },
            // missing id
            { name: "n2", provider_key: "cdek", provider_connect_id: "p2", is_enabled: true },
            // missing name
            { id: "c3", provider_key: "cdek", provider_connect_id: "p3", is_enabled: true },
            // missing provider_connect_id
            { id: "c4", name: "n4", provider_key: "cdek", is_enabled: true },
            // missing is_enabled
            { id: "c5", name: "n5", provider_key: "cdek", provider_connect_id: "p5" },
          ],
        },
      })

      expect(result.settings.connections).toHaveLength(1)
      expect(result.settings.connections[0].id).toBe("c1")
    })

    it("keeps empty connections array when none provided", () => {
      const result = service.normalizeApishipOptions_({ token: "tok", is_test: true })
      expect(result.settings.connections).toEqual([])
    })
  })

  describe("defaults", () => {
    it("fills default_product_sizes with 10/10/10/20 when not provided", () => {
      const result = service.normalizeApishipOptions_({ token: "tok", is_test: true })
      expect(result.settings.default_product_sizes).toEqual({
        length: 10,
        width: 10,
        height: 10,
        weight: 20,
      })
    })

    it("preserves provided default_product_sizes", () => {
      const result = service.normalizeApishipOptions_({
        token: "tok",
        is_test: true,
        settings: {
          default_product_sizes: { length: 30, width: 20, height: 15, weight: 50 },
        },
      })
      expect(result.settings.default_product_sizes).toEqual({
        length: 30,
        width: 20,
        height: 15,
        weight: 50,
      })
    })

    it("fills delivery_cost_vat with -1 when not provided", () => {
      const result = service.normalizeApishipOptions_({ token: "tok", is_test: true })
      expect(result.settings.delivery_cost_vat).toBe(-1)
    })

    it("fills is_cod with false when not provided", () => {
      const result = service.normalizeApishipOptions_({ token: "tok", is_test: true })
      expect(result.settings.is_cod).toBe(false)
    })

    it("preserves is_cod=true when provided", () => {
      const result = service.normalizeApishipOptions_({
        token: "tok",
        is_test: true,
        settings: { is_cod: true },
      })
      expect(result.settings.is_cod).toBe(true)
    })

    it("fills default_sender_settings with empty strings when not provided", () => {
      const result = service.normalizeApishipOptions_({ token: "tok", is_test: true })
      expect(result.settings.default_sender_settings).toEqual({
        country_code: "",
        address_string: "",
        contact_name: "",
        phone: "",
      })
    })
  })
})

describe("ApishipBase.assertOrderOptions_ (private helper)", () => {
  let service: any

  beforeEach(() => {
    service = new (ApishipService as any)({ logger: makeLogger() }, {})
  })

  const validOptions = {
    token: "tok",
    is_test: true,
    settings: {
      connections: [],
      default_sender_settings: {
        country_code: "RU",
        address_string: "Moscow",
        contact_name: "Ivan",
        phone: "+79001234567",
      },
      default_product_sizes: { length: 10, width: 10, height: 10, weight: 20 },
      delivery_cost_vat: -1,
      is_cod: false,
    },
  }

  it("does not throw when all sender settings are present", () => {
    expect(() => service.assertOrderOptions_(validOptions)).not.toThrow()
  })

  it.each([
    ["country_code", { ...validOptions, settings: { ...validOptions.settings, default_sender_settings: { ...validOptions.settings.default_sender_settings, country_code: "" } } }],
    ["address_string", { ...validOptions, settings: { ...validOptions.settings, default_sender_settings: { ...validOptions.settings.default_sender_settings, address_string: "" } } }],
    ["contact_name", { ...validOptions, settings: { ...validOptions.settings, default_sender_settings: { ...validOptions.settings.default_sender_settings, contact_name: "" } } }],
    ["phone", { ...validOptions, settings: { ...validOptions.settings, default_sender_settings: { ...validOptions.settings.default_sender_settings, phone: "" } } }],
  ])("throws when %s is empty", (field, options) => {
    expect(() => service.assertOrderOptions_(options)).toThrow(new RegExp(field))
  })
})
