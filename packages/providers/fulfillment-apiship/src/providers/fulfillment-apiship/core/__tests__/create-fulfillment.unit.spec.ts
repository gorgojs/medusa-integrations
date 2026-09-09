jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track: () => {} }),
}))

jest.mock("../../../../workflows", () => ({
  getCalculationWorkflow: jest.fn(),
  saveCalculationWorkflow: jest.fn(),
  getStockLocationWorkflow: jest.fn(),
  getShippingOptionWorkflow: jest.fn(),
}))

import {
  getStockLocationWorkflow,
  getShippingOptionWorkflow,
  getCalculationWorkflow,
  saveCalculationWorkflow,
} from "../../../../workflows"
import ApishipBase from "../apiship-base"
import { makeApishipOptions, makeApishipClient, makeOrder, baseStockLocation, makeProvider } from "./test-utils"

const baseData = {
  apishipData: {
    tariff: { tariffId: 123, providerKey: "cdek" },
  },
}

const baseFulfillment = {
  id: "ful-01",
  location_id: "loc-01",
  shipping_option_id: "so-01",
}

const baseShippingOption = {
  id: "so-01",
  data: { deliveryType: 1, pickupType: 1 },
}

function setupWorkflowMocks() {
  ;(getStockLocationWorkflow as unknown as jest.Mock).mockReturnValue({
    run: jest.fn().mockResolvedValue({ result: baseStockLocation }),
  })
  ;(getShippingOptionWorkflow as unknown as jest.Mock).mockReturnValue({
    run: jest.fn().mockResolvedValue({ result: baseShippingOption }),
  })
  ;(getCalculationWorkflow as unknown as jest.Mock).mockReturnValue({
    run: jest.fn().mockResolvedValue({ result: null }),
  })
  ;(saveCalculationWorkflow as unknown as jest.Mock).mockReturnValue({
    run: jest.fn().mockResolvedValue({ result: undefined }),
  })
}

describe("ApishipBase.createFulfillment", () => {
  let service: any
  let apishipClient: ReturnType<typeof makeApishipClient>

  beforeEach(() => {
    jest.clearAllMocks()
    apishipClient = makeApishipClient()
    service = makeProvider(makeApishipOptions(), apishipClient)
  })

  it("calls addOrder and returns orderId in result.data", async () => {
    setupWorkflowMocks()
    apishipClient.ordersApi.addOrder.mockResolvedValue({ data: { orderId: 9999 } })
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "CDEK-123", trackingUrl: "https://track.cdek.ru/123" } },
    })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/9999.pdf" },
    })

    const result = await service.createFulfillment(
      baseData,
      [],
      makeOrder(),
      baseFulfillment
    )

    expect(apishipClient.ordersApi.addOrder).toHaveBeenCalledTimes(1)
    expect(result.data).toMatchObject({ orderId: 9999 })
  })

  it("result.labels contains tracking_number, tracking_url, label_url", async () => {
    setupWorkflowMocks()
    apishipClient.ordersApi.addOrder.mockResolvedValue({ data: { orderId: 9999 } })
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "CDEK-123", trackingUrl: "https://track.cdek.ru/123" } },
    })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/9999.pdf" },
    })

    const result = await service.createFulfillment(baseData, [], makeOrder(), baseFulfillment)

    expect(Array.isArray(result.labels)).toBe(true)
    expect(result.labels[0]).toMatchObject({
      tracking_number: "CDEK-123",
      tracking_url: "https://track.cdek.ru/123",
      label_url: "https://api.apiship.ru/labels/9999.pdf",
    })
  })

  it("passes deliveryType=2 option: includes pointOutId in order request", async () => {
    const fulfillmentWithPoint = {
      ...baseFulfillment,
      shipping_option_id: "so-point",
    }
    const shippingOptionPoint = {
      id: "so-point",
      data: { deliveryType: 2, pickupType: 1 },
    }
    ;(getShippingOptionWorkflow as unknown as jest.Mock).mockReturnValue({
      run: jest.fn().mockResolvedValue({ result: shippingOptionPoint }),
    })
    const dataWithPoint = {
      ...baseData,
      apishipData: {
        ...baseData.apishipData,
        point: { id: "42" },
      },
    }
    setupWorkflowMocks()
    ;(getShippingOptionWorkflow as unknown as jest.Mock).mockReturnValue({
      run: jest.fn().mockResolvedValue({ result: shippingOptionPoint }),
    })
    apishipClient.ordersApi.addOrder.mockResolvedValue({ data: { orderId: 1111 } })
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "X1", trackingUrl: "" } },
    })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/1111.pdf" },
    })

    await service.createFulfillment(dataWithPoint, [], makeOrder(), fulfillmentWithPoint)

    const orderRequest = apishipClient.ordersApi.addOrder.mock.calls[0][0].orderRequest
    expect(orderRequest.order.pointOutId).toBe(42)
  })

  it("passes pickupType=2 option: includes pointInId from the connection in order request", async () => {
    const fulfillmentFromPoint = {
      ...baseFulfillment,
      shipping_option_id: "so-point-in",
    }
    const shippingOptionPointIn = {
      id: "so-point-in",
      data: { deliveryType: 1, pickupType: 2 },
    }
    const optionsWithPointIn = makeApishipOptions()
    optionsWithPointIn.connections = [
      {
        id: "conn-1",
        name: "CDEK Test",
        provider_key: "cdek",
        provider_connect_id: "connect-123",
        is_enabled: true,
        point_in_id: "77",
      },
    ]
    service = makeProvider(optionsWithPointIn, apishipClient)
    ;(getShippingOptionWorkflow as unknown as jest.Mock).mockReturnValue({
      run: jest.fn().mockResolvedValue({ result: shippingOptionPointIn }),
    })
    setupWorkflowMocks()
    ;(getShippingOptionWorkflow as unknown as jest.Mock).mockReturnValue({
      run: jest.fn().mockResolvedValue({ result: shippingOptionPointIn }),
    })
    apishipClient.ordersApi.addOrder.mockResolvedValue({ data: { orderId: 2222 } })
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "X2", trackingUrl: "" } },
    })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/2222.pdf" },
    })

    await service.createFulfillment(baseData, [], makeOrder(), fulfillmentFromPoint)

    const orderRequest = apishipClient.ordersApi.addOrder.mock.calls[0][0].orderRequest
    expect(orderRequest.order.pointInId).toBe(77)
  })

  it("skips addOrder and reuses the cached orderId when this shipment was already created", async () => {
    setupWorkflowMocks()
    ;(getCalculationWorkflow as unknown as jest.Mock).mockReturnValue({
      run: jest.fn().mockResolvedValue({
        result: { orderId: 5555, order: { order: { tariffId: 123 } } },
      }),
    })
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "CDEK-555", trackingUrl: "" } },
    })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/5555.pdf" },
    })

    const result = await service.createFulfillment(baseData, [], makeOrder(), baseFulfillment)

    expect(apishipClient.ordersApi.addOrder).not.toHaveBeenCalled()
    expect(result.data).toMatchObject({ orderId: 5555 })
  })

  it("caches the created order right after addOrder succeeds, before waiting for documents", async () => {
    setupWorkflowMocks()
    apishipClient.ordersApi.addOrder.mockResolvedValue({ data: { orderId: 9999 } })
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "CDEK-123", trackingUrl: "" } },
    })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/9999.pdf" },
    })

    await service.createFulfillment(baseData, [], makeOrder(), baseFulfillment)

    const saveRun = (saveCalculationWorkflow as unknown as jest.Mock).mock.results[0].value.run
    expect(saveRun).toHaveBeenCalledWith({
      input: expect.objectContaining({
        data: expect.objectContaining({ orderId: 9999 }),
      }),
    })
  })

  it("does not cache the order when addOrder itself fails — nothing was created", async () => {
    setupWorkflowMocks()
    apishipClient.ordersApi.addOrder.mockRejectedValue(new Error("Connection refused"))

    await expect(
      service.createFulfillment(baseData, [], makeOrder(), baseFulfillment)
    ).rejects.toThrow()

    expect(saveCalculationWorkflow).not.toHaveBeenCalled()
  })

  it("does NOT throw when getShipmentDocuments fails after a cache hit — order already exists", async () => {
    const sleepSpy = jest
      .spyOn(ApishipBase.prototype as any, "sleep")
      .mockResolvedValue(undefined)

    setupWorkflowMocks()
    ;(getCalculationWorkflow as unknown as jest.Mock).mockReturnValue({
      run: jest.fn().mockResolvedValue({
        result: { orderId: 5555, order: { order: { tariffId: 123 } } },
      }),
    })
    apishipClient.ordersApi.getOrderInfo.mockRejectedValue(new Error("still not ready"))

    const result = await service.createFulfillment(baseData, [], makeOrder(), baseFulfillment)

    expect(apishipClient.ordersApi.addOrder).not.toHaveBeenCalled()
    expect(result.data).toMatchObject({ orderId: 5555 })
    expect(result.labels).toEqual([])

    sleepSpy.mockRestore()
  })

  it("does NOT throw when getShipmentDocuments fails right after a fresh addOrder — the order still exists", async () => {
    const sleepSpy = jest
      .spyOn(ApishipBase.prototype as any, "sleep")
      .mockResolvedValue(undefined)

    setupWorkflowMocks()
    apishipClient.ordersApi.addOrder.mockResolvedValue({ data: { orderId: 40590307 } })
    apishipClient.ordersApi.getOrderInfo.mockRejectedValue(new Error("data not ready after 10 attempts"))

    const result = await service.createFulfillment(baseData, [], makeOrder(), baseFulfillment)

    expect(apishipClient.ordersApi.addOrder).toHaveBeenCalledTimes(1)
    expect(result.data).toMatchObject({ orderId: 40590307 })
    expect(result.labels).toEqual([])
    // The order must still be cached even though documents failed — a retry must not recreate it.
    expect(saveCalculationWorkflow).toHaveBeenCalled()

    sleepSpy.mockRestore()
  })

  it("wraps addOrder errors with context message", async () => {
    setupWorkflowMocks()
    apishipClient.ordersApi.addOrder.mockRejectedValue(new Error("Connection refused"))

    await expect(
      service.createFulfillment(baseData, [], makeOrder(), baseFulfillment)
    ).rejects.toThrow(/An error occurred in createFulfillment/)
  })

  it("throws when sender country_code is missing (assertOrderOptions_)", async () => {
    const invalidOptions = makeApishipOptions()
    invalidOptions.sender_country_code = ""
    service = makeProvider(invalidOptions, apishipClient)
    setupWorkflowMocks()

    await expect(
      service.createFulfillment(baseData, [], makeOrder(), baseFulfillment)
    ).rejects.toThrow(/country_code/)
  })

  it("throws when sender address_string is missing (assertOrderOptions_)", async () => {
    const invalidOptions = makeApishipOptions()
    // Force stock location to have no address parts so addressString falls back
    ;(getStockLocationWorkflow as unknown as jest.Mock).mockReturnValue({
      run: jest.fn().mockResolvedValue({
        result: {
          ...baseStockLocation,
          address: { country_code: "RU" }, // no city/address_1/address_2
        },
      }),
    })
    invalidOptions.sender_address_string = ""
    service = makeProvider(invalidOptions, apishipClient)
    setupWorkflowMocks()
    ;(getStockLocationWorkflow as unknown as jest.Mock).mockReturnValue({
      run: jest.fn().mockResolvedValue({
        result: {
          ...baseStockLocation,
          address: { country_code: "RU" },
        },
      }),
    })

    await expect(
      service.createFulfillment(baseData, [], makeOrder(), baseFulfillment)
    ).rejects.toThrow(/address_string/)
  })
})
