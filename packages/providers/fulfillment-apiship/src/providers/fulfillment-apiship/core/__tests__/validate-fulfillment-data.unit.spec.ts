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
  getCalculationWorkflow,
  saveCalculationWorkflow,
} from "../../../../workflows"
import { makeApishipClient, makeApishipOptions, makeProvider } from "./test-utils"

const calculation = {
  deliveryToDoor: [
    {
      providerKey: "cdek",
      tariffs: [{ tariffId: 1, tariffName: "CDEK Door", deliveryCost: 500, daysMin: 1, daysMax: 2 }],
    },
  ],
  deliveryToPoint: [
    {
      providerKey: "cdek",
      tariffs: [
        { tariffId: 3, tariffName: "CDEK Pickup", deliveryCost: 200, daysMin: 2, daysMax: 3, pointIds: [10, 11] },
      ],
    },
  ],
}

const doorOption = { id: "apiship_door", deliveryType: 1, pickupType: 1 }
const pointOption = { id: "apiship_point", deliveryType: 2, pickupType: 1 }

const context = {
  id: "cart_01HX",
  shipping_address: { country_code: "RU", city: "Москва", address_1: "ул. Ленина, 1", postal_code: "101000" },
  from_location: { address: { country_code: "RU", city: "Москва", address_1: "Тверская, 1", postal_code: "125009" } },
  items: [{ id: "item-01", quantity: 1, unit_price: 1000, variant: { weight: 500, height: 10, length: 20, width: 15 } }],
} as any

describe("ApishipBase.validateFulfillmentData", () => {
  let service: any

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getCalculationWorkflow as unknown as jest.Mock).mockReturnValue({
      run: jest.fn().mockResolvedValue({ result: calculation }),
    })
    ;(saveCalculationWorkflow as unknown as jest.Mock).mockReturnValue({
      run: jest.fn().mockResolvedValue({}),
    })
    service = makeProvider(makeApishipOptions(), makeApishipClient())
  })

  it("returns data without a selection unchanged", async () => {
    const data = { foo: "bar" }

    await expect(service.validateFulfillmentData(doorOption, data, context)).resolves.toBe(data)
  })

  it("rejects a tariff the server calculation does not offer", async () => {
    const data = { apishipData: { tariff: { tariffId: 99, providerKey: "cdek", deliveryCost: 1 } } }

    await expect(service.validateFulfillmentData(doorOption, data, context)).rejects.toThrow(
      /tariff is not available/
    )
  })

  it("rejects a pickup point the chosen tariff does not serve", async () => {
    const data = {
      apishipData: {
        tariff: { tariffId: 3, providerKey: "cdek" },
        point: { id: "12", name: "Elsewhere" },
      },
    }

    await expect(service.validateFulfillmentData(pointOption, data, context)).rejects.toThrow(
      /not served by the chosen ApiShip tariff/
    )
  })

  it("stores the server's tariff and only the point fields the checkout shows", async () => {
    const data = {
      apishipData: {
        deliveryType: 1,
        tariff: { key: "cdek:3", tariffId: 3, providerKey: "cdek", deliveryCost: 1, pointIds: [10, 11] },
        point: {
          id: 11,
          providerKey: "boxberry",
          name: "КАМ32",
          address: "Коммунарка, 10",
          photos: ["https://example.com/1.jpg"],
          description: "Вход с парковки",
          worktime: { 1: "09:00-19:00" },
          lat: 55.57,
          lng: 37.47,
        },
      },
    }

    const result = await service.validateFulfillmentData(pointOption, data, context)

    expect(result.apishipData).toEqual({
      deliveryType: 2,
      tariff: {
        key: "cdek:3",
        providerKey: "cdek",
        tariffId: 3,
        tariffName: "CDEK Pickup",
        deliveryCost: 200,
        daysMin: 2,
        daysMax: 3,
      },
      point: { id: "11", providerKey: "cdek", name: "КАМ32", address: "Коммунарка, 10" },
    })
  })

  it("drops a pickup point sent with a courier option", async () => {
    const data = {
      apishipData: {
        tariff: { tariffId: 1, providerKey: "cdek" },
        point: { id: "10" },
      },
    }

    const result = await service.validateFulfillmentData(doorOption, data, context)

    expect(result.apishipData.point).toBeUndefined()
    expect(result.apishipData.tariff.deliveryCost).toBe(500)
  })
})
