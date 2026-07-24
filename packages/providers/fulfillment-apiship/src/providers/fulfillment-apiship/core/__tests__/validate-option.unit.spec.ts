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

const baseValidOption = {
  id: "apiship_doortodoor",
  deliveryType: 1,
  pickupType: 1,
}

describe("ApishipBase.validateOption", () => {
  let service: any

  beforeEach(() => {
    service = new (ApishipService as any)({ logger: makeLogger() }, {})
  })

  describe("id validation", () => {
    it("returns false when id is missing", async () => {
      const result = await service.validateOption({ deliveryType: 1, pickupType: 1 })
      expect(result).toBe(false)
    })

    it("returns false when id is undefined", async () => {
      const result = await service.validateOption({ id: undefined, deliveryType: 1, pickupType: 1 })
      expect(result).toBe(false)
    })
  })

  describe("deliveryType validation", () => {
    it("returns false when deliveryType is missing", async () => {
      const result = await service.validateOption({ id: "opt-1", pickupType: 1 })
      expect(result).toBe(false)
    })

    it("returns false when deliveryType is 0 (invalid)", async () => {
      const result = await service.validateOption({ id: "opt-1", deliveryType: 0, pickupType: 1 })
      expect(result).toBe(false)
    })

    it("returns false when deliveryType is 3 (invalid)", async () => {
      const result = await service.validateOption({ id: "opt-1", deliveryType: 3, pickupType: 1 })
      expect(result).toBe(false)
    })
  })

  describe("pickupType validation", () => {
    it("returns false when pickupType is missing", async () => {
      const result = await service.validateOption({ id: "opt-1", deliveryType: 1 })
      expect(result).toBe(false)
    })

    it("returns false when pickupType is 0 (invalid)", async () => {
      const result = await service.validateOption({ id: "opt-1", deliveryType: 1, pickupType: 0 })
      expect(result).toBe(false)
    })

    it("returns false when pickupType is 3 (invalid)", async () => {
      const result = await service.validateOption({ id: "opt-1", deliveryType: 1, pickupType: 3 })
      expect(result).toBe(false)
    })
  })

  describe("valid options", () => {
    it.each<[string, any]>([
      ["doortodoor", { ...baseValidOption, deliveryType: 1, pickupType: 1 }],
      ["doortopoint", { ...baseValidOption, deliveryType: 2, pickupType: 1 }],
      ["pointtodoor", { ...baseValidOption, deliveryType: 1, pickupType: 2 }],
      ["pointtopoint", { ...baseValidOption, deliveryType: 2, pickupType: 2 }],
    ])("%s returns true", async (_name, option) => {
      const result = await service.validateOption(option)
      expect(result).toBe(true)
    })
  })
})
