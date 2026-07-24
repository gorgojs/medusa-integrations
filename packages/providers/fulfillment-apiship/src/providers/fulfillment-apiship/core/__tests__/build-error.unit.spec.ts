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

import axios from "axios"
import ApishipService from "../../services/apiship"
import { makeLogger } from "./test-utils"

describe("ApishipBase.buildError (protected helper)", () => {
  it("wraps a plain Error with the provided context message + error.message", () => {
    const service: any = new (ApishipService as any)({ logger: makeLogger() }, {})
    const original = new Error("something went wrong")
    const wrapped = service.buildError("An error occurred in cancelFulfillment", original)

    expect(wrapped).toBeInstanceOf(Error)
    expect(wrapped.message).toMatch(/An error occurred in cancelFulfillment/)
    expect(wrapped.message).toMatch(/something went wrong/)
  })

  it("wraps an AxiosError with status, code and description from the response", () => {
    const service: any = new (ApishipService as any)({ logger: makeLogger() }, {})
    const axiosError = new axios.AxiosError("Request failed with status code 400")
    ;(axiosError as any).response = {
      status: 400,
      data: { code: "ORDER_NOT_FOUND", description: "Заказ не найден" },
    }

    const wrapped = service.buildError("An error occurred in cancelFulfillment", axiosError)

    expect(wrapped).toBeInstanceOf(Error)
    expect(wrapped.message).toMatch(/An error occurred in cancelFulfillment/)
    expect(wrapped.message).toMatch(/400/)
    expect(wrapped.message).toMatch(/ORDER_NOT_FOUND/)
    expect(wrapped.message).toMatch(/Заказ не найден/)
  })

  it("trims trailing whitespace when AxiosError response data has no description", () => {
    const service: any = new (ApishipService as any)({ logger: makeLogger() }, {})
    const axiosError = new axios.AxiosError("Server error")
    ;(axiosError as any).response = {
      status: 500,
      data: {},
    }

    const wrapped = service.buildError("ctx", axiosError)

    expect(wrapped.message).not.toMatch(/\s+$/)
  })

  it("trims trailing whitespace for a plain Error with no extra context", () => {
    const service: any = new (ApishipService as any)({ logger: makeLogger() }, {})
    const original = new Error("plain")
    const wrapped = service.buildError("ctx", original)

    expect(wrapped.message).not.toMatch(/\s+$/)
  })
})
