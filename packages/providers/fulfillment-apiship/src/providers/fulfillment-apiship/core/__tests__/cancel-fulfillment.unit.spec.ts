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

import { getApishipClientConfigWorkflow } from "../../../../workflows"
import { createApishipClient } from "../../../../lib/client"
import axios from "axios"
import ApishipService from "../../services/apiship"
import { makeLogger, makeApishipClient } from "./test-utils"

function setupClientMock(client: ReturnType<typeof makeApishipClient>) {
  ;(getApishipClientConfigWorkflow as unknown as jest.Mock).mockReturnValue({
    run: jest.fn().mockResolvedValue({ result: { token: "test-token", isTest: true } }),
  })
  ;(createApishipClient as unknown as jest.Mock).mockReturnValue(client)
}

describe("ApishipBase.cancelFulfillment", () => {
  let service: any
  let apishipClient: ReturnType<typeof makeApishipClient>

  beforeEach(() => {
    jest.clearAllMocks()
    service = new (ApishipService as any)({ logger: makeLogger() }, {})
    apishipClient = makeApishipClient()
  })

  it("calls cancelOrder with the orderId from data", async () => {
    setupClientMock(apishipClient)
    apishipClient.ordersApi.cancelOrder.mockResolvedValue({ data: { success: true } })

    await service.cancelFulfillment({ orderId: 9999 })

    expect(apishipClient.ordersApi.cancelOrder).toHaveBeenCalledTimes(1)
    expect(apishipClient.ordersApi.cancelOrder).toHaveBeenCalledWith({ orderId: 9999 })
  })

  it("returns the API response", async () => {
    setupClientMock(apishipClient)
    const mockResponse = { data: { success: true, message: "Cancelled" } }
    apishipClient.ordersApi.cancelOrder.mockResolvedValue(mockResponse)

    const result = await service.cancelFulfillment({ orderId: 9999 })

    expect(result).toEqual(mockResponse)
  })

  it("wraps plain errors with context message", async () => {
    setupClientMock(apishipClient)
    apishipClient.ordersApi.cancelOrder.mockRejectedValue(new Error("Network error"))

    await expect(service.cancelFulfillment({ orderId: 9999 })).rejects.toThrow(
      /An error occurred in cancelFulfillment/
    )
  })

  it("wraps AxiosError with status and description", async () => {
    setupClientMock(apishipClient)
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
