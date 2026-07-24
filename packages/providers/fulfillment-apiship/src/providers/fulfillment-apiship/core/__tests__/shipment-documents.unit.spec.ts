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
import ApishipBase from "../apiship-base"
import ApishipService from "../../services/apiship"
import { makeLogger, makeApishipClient } from "./test-utils"

function setupClientMock(client: ReturnType<typeof makeApishipClient>) {
  ;(getApishipClientConfigWorkflow as unknown as jest.Mock).mockReturnValue({
    run: jest.fn().mockResolvedValue({ result: { token: "test-token", isTest: true } }),
  })
  ;(createApishipClient as unknown as jest.Mock).mockReturnValue(client)
}

describe("ApishipBase.getShipmentDocuments", () => {
  let service: any
  let apishipClient: ReturnType<typeof makeApishipClient>
  let sleepSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    service = new (ApishipService as any)({ logger: makeLogger() }, {})
    apishipClient = makeApishipClient()
    // Make sleep instant so retry tests don't slow down the test suite
    sleepSpy = jest
      .spyOn(ApishipBase.prototype as any, "sleep")
      .mockResolvedValue(undefined)
  })

  afterEach(() => {
    sleepSpy.mockRestore()
  })

  it("returns label array with tracking_number, tracking_url and label_url when ready on first attempt", async () => {
    setupClientMock(apishipClient)
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "CDEK-123", trackingUrl: "https://track.cdek.ru/123" } },
    })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/9999.pdf" },
    })

    const result = await service.getShipmentDocuments({ orderId: 9999 })

    expect(Array.isArray(result)).toBe(true)
    expect(result[0]).toEqual({
      tracking_number: "CDEK-123",
      tracking_url: "https://track.cdek.ru/123",
      label_url: "https://api.apiship.ru/labels/9999.pdf",
    })
  })

  it("retries getOrderInfo until providerNumber is available", async () => {
    setupClientMock(apishipClient)
    // First 2 calls: no providerNumber; 3rd call: ready
    apishipClient.ordersApi.getOrderInfo
      .mockResolvedValueOnce({ data: { order: {} } })
      .mockResolvedValueOnce({ data: { order: {} } })
      .mockResolvedValue({
        data: { order: { providerNumber: "CDEK-456", trackingUrl: "" } },
      })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/1.pdf" },
    })

    const result = await service.getShipmentDocuments({ orderId: 1 })

    expect(apishipClient.ordersApi.getOrderInfo).toHaveBeenCalledTimes(3)
    expect(result[0].tracking_number).toBe("CDEK-456")
  })

  it("retries getLabels until url is available", async () => {
    setupClientMock(apishipClient)
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "X1", trackingUrl: "" } },
    })
    // First call: no url; 2nd call: ready
    apishipClient.orderDocsApi.getLabels
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValue({ data: { url: "https://api.apiship.ru/labels/2.pdf" } })

    const result = await service.getShipmentDocuments({ orderId: 2 })

    expect(apishipClient.orderDocsApi.getLabels).toHaveBeenCalledTimes(2)
    expect(result[0].label_url).toBe("https://api.apiship.ru/labels/2.pdf")
  })

  it("throws after max attempts when getOrderInfo never returns providerNumber", async () => {
    setupClientMock(apishipClient)
    // Always returns empty order
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({ data: { order: {} } })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/3.pdf" },
    })

    await expect(service.getShipmentDocuments({ orderId: 3 })).rejects.toThrow(
      /getShipmentDocuments failed/
    )
    // 10 is the default maxAttempts for executeWithRetry
    expect(apishipClient.ordersApi.getOrderInfo).toHaveBeenCalledTimes(10)
  })

  it("throws after max attempts when getLabels never returns url", async () => {
    setupClientMock(apishipClient)
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "X1", trackingUrl: "" } },
    })
    // Always returns no url
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({ data: {} })

    await expect(service.getShipmentDocuments({ orderId: 4 })).rejects.toThrow(
      /getShipmentDocuments failed/
    )
    expect(apishipClient.orderDocsApi.getLabels).toHaveBeenCalledTimes(10)
  })

  it("handles empty trackingUrl gracefully (returns empty string)", async () => {
    setupClientMock(apishipClient)
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "X2" } }, // no trackingUrl
    })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/5.pdf" },
    })

    const result = await service.getShipmentDocuments({ orderId: 5 })

    expect(result[0].tracking_url).toBe("")
  })
})
