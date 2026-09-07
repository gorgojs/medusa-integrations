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
} from "../../../../workflows"
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
