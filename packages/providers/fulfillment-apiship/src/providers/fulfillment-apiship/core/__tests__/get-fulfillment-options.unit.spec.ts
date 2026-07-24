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

describe("ApishipService.getFulfillmentOptions", () => {
  let service: any

  beforeEach(() => {
    service = new (ApishipService as any)({ logger: makeLogger() }, {})
  })

  it("returns exactly 5 options", async () => {
    const options = await service.getFulfillmentOptions()
    expect(options).toHaveLength(5)
  })

  it("includes apiship_doortodoor with deliveryType=1, pickupType=1", async () => {
    const options = await service.getFulfillmentOptions()
    const opt = options.find((o: any) => o.id === "apiship_doortodoor")

    expect(opt).toBeDefined()
    expect(opt.deliveryType).toBe(1)
    expect(opt.pickupType).toBe(1)
  })

  it("includes apiship_doortopoint with deliveryType=2, pickupType=1", async () => {
    const options = await service.getFulfillmentOptions()
    const opt = options.find((o: any) => o.id === "apiship_doortopoint")

    expect(opt).toBeDefined()
    expect(opt.deliveryType).toBe(2)
    expect(opt.pickupType).toBe(1)
  })

  it("includes apiship_pointtodoor with deliveryType=1, pickupType=2", async () => {
    const options = await service.getFulfillmentOptions()
    const opt = options.find((o: any) => o.id === "apiship_pointtodoor")

    expect(opt).toBeDefined()
    expect(opt.deliveryType).toBe(1)
    expect(opt.pickupType).toBe(2)
  })

  it("includes apiship_pointtopoint with deliveryType=2, pickupType=2", async () => {
    const options = await service.getFulfillmentOptions()
    const opt = options.find((o: any) => o.id === "apiship_pointtopoint")

    expect(opt).toBeDefined()
    expect(opt.deliveryType).toBe(2)
    expect(opt.pickupType).toBe(2)
  })

  it("includes apiship_return with is_return=true (no deliveryType/pickupType)", async () => {
    const options = await service.getFulfillmentOptions()
    const opt = options.find((o: any) => o.id === "apiship_return")

    expect(opt).toBeDefined()
    expect(opt.is_return).toBe(true)
    expect(opt.deliveryType).toBeUndefined()
    expect(opt.pickupType).toBeUndefined()
  })

  it("all non-return options have a name string", async () => {
    const options = await service.getFulfillmentOptions()
    for (const opt of options) {
      expect(typeof opt.name).toBe("string")
      expect(opt.name.length).toBeGreaterThan(0)
    }
  })
})
