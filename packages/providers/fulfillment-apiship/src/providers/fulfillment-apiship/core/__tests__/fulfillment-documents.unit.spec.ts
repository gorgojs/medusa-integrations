jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track: () => {} }),
}))

jest.mock("../../../../workflows", () => ({
  getCalculationWorkflow: jest.fn(),
  saveCalculationWorkflow: jest.fn(),
  getStockLocationWorkflow: jest.fn(),
  getShippingOptionWorkflow: jest.fn(),
}))

import { makeApishipClient, makeProvider } from "./test-utils"

describe("ApishipBase.getFulfillmentDocuments", () => {
  let service: any
  let apishipClient: ReturnType<typeof makeApishipClient>

  beforeEach(() => {
    jest.clearAllMocks()
    apishipClient = makeApishipClient()
    service = makeProvider(undefined, apishipClient)
  })

  it("calls getWaybills with correct orderId and format, returns waybill file", async () => {
    const fakeFile = "base64-encoded-pdf-content"
    apishipClient.orderDocsApi.getWaybills.mockResolvedValue({
      data: { waybillItems: [{ file: fakeFile }] },
    })

    const result = await service.getFulfillmentDocuments({ orderId: 9999 })

    expect(apishipClient.orderDocsApi.getWaybills).toHaveBeenCalledTimes(1)
    const callArg = apishipClient.orderDocsApi.getWaybills.mock.calls[0][0]
    expect(callArg.documentsRequest.orderIds).toEqual([9999])
    expect(callArg.documentsRequest.format).toBe("pdf")
    expect(result).toBe(fakeFile)
  })

  it("wraps errors with context message", async () => {
    apishipClient.orderDocsApi.getWaybills.mockRejectedValue(new Error("API error"))

    await expect(service.getFulfillmentDocuments({ orderId: 9999 })).rejects.toThrow(
      /An error occurred in getFulfillmentDocuments/
    )
  })

  it("throws when waybillItems is an empty array", async () => {
    apishipClient.orderDocsApi.getWaybills.mockResolvedValue({
      data: { waybillItems: [] },
    })

    await expect(service.getFulfillmentDocuments({ orderId: 9999 })).rejects.toThrow(
      /An error occurred in getFulfillmentDocuments/
    )
  })

  it("returns undefined when waybillItems is null (optional chaining short-circuits)", async () => {
    apishipClient.orderDocsApi.getWaybills.mockResolvedValue({
      data: { waybillItems: null },
    })

    const result = await service.getFulfillmentDocuments({ orderId: 9999 })
    expect(result).toBeUndefined()
  })

  it("returns undefined when waybillItems is missing from response", async () => {
    apishipClient.orderDocsApi.getWaybills.mockResolvedValue({
      data: {},
    })

    const result = await service.getFulfillmentDocuments({ orderId: 9999 })
    expect(result).toBeUndefined()
  })
})
