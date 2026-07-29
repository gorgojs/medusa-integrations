jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track: () => {} }),
}))

jest.mock("../../../../workflows", () => ({
  getCalculationWorkflow: jest.fn(),
  saveCalculationWorkflow: jest.fn(),
  getStockLocationWorkflow: jest.fn(),
  getShippingOptionWorkflow: jest.fn(),
}))

import axios from "axios"
import { makeApishipClient, makeProvider } from "./test-utils"

describe("ApishipBase.cancelFulfillment", () => {
  let service: any
  let apishipClient: ReturnType<typeof makeApishipClient>

  beforeEach(() => {
    jest.clearAllMocks()
    apishipClient = makeApishipClient()
    service = makeProvider(undefined, apishipClient)
  })

  it("calls cancelOrder with the orderId from data", async () => {
    apishipClient.ordersApi.cancelOrder.mockResolvedValue({ data: { success: true } })

    await service.cancelFulfillment({ orderId: 9999 })

    expect(apishipClient.ordersApi.cancelOrder).toHaveBeenCalledTimes(1)
    expect(apishipClient.ordersApi.cancelOrder).toHaveBeenCalledWith({ orderId: 9999 })
  })

  it("returns the API response", async () => {
    const mockResponse = { data: { success: true, message: "Cancelled" } }
    apishipClient.ordersApi.cancelOrder.mockResolvedValue(mockResponse)

    const result = await service.cancelFulfillment({ orderId: 9999 })

    expect(result).toEqual(mockResponse)
  })

  it("wraps plain errors with context message", async () => {
    apishipClient.ordersApi.cancelOrder.mockRejectedValue(new Error("Network error"))

    await expect(service.cancelFulfillment({ orderId: 9999 })).rejects.toThrow(
      /An error occurred in cancelFulfillment/
    )
  })

  it("wraps AxiosError with status and description", async () => {
    const axiosError = new axios.AxiosError("Not found")
    ;(axiosError as any).response = {
      status: 404,
      data: { code: "ORDER_NOT_FOUND", description: "Order not found" },
    }
    apishipClient.ordersApi.cancelOrder.mockRejectedValue(axiosError)

    await expect(service.cancelFulfillment({ orderId: 9999 })).rejects.toThrow(
      /An error occurred in cancelFulfillment/
    )
    await expect(service.cancelFulfillment({ orderId: 9999 })).rejects.toThrow(/404/)
  })
})
