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

describe("ApishipBase no-op / stub methods", () => {
  let service: any

  beforeEach(() => {
    service = new (ApishipService as any)({ logger: makeLogger() }, {})
  })

  describe("createReturnFulfillment", () => {
    it("returns { data: {}, labels: [] } without any API call", async () => {
      const result = await service.createReturnFulfillment({ orderId: 9999 })

      expect(result).toEqual({ data: {}, labels: [] })
    })
  })

  describe("getReturnDocuments", () => {
    it("returns an empty array without any API call", async () => {
      const result = await service.getReturnDocuments({ orderId: 9999 })

      expect(result).toEqual([])
    })
  })

  describe("retrieveDocuments", () => {
    it("returns undefined without any API call", async () => {
      const result = await service.retrieveDocuments({ orderId: 9999 }, "label")

      expect(result).toBeUndefined()
    })
  })

  describe("validateFulfillmentData", () => {
    it("returns the data argument unchanged", async () => {
      const inputData = { foo: "bar", nested: { a: 1 } }
      const result = await service.validateFulfillmentData({}, inputData, {})

      expect(result).toEqual(inputData)
      expect(result).toBe(inputData) // same reference
    })
  })

  describe("canCalculate", () => {
    it("always returns true", async () => {
      const result = await service.canCalculate({} as any)

      expect(result).toBe(true)
    })
  })
})
