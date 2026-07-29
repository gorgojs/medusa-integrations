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
import { makeApishipOptions, makeApishipClient, makeProvider } from "./test-utils"

const mockCalculatorResponse = {
  deliveryToDoor: [
    {
      providerKey: "cdek",
      tariffs: [
        { tariffId: 1, deliveryCost: 500, name: "CDEK Express" },
        { tariffId: 2, deliveryCost: 300, name: "CDEK Standard" },
      ],
    },
  ],
  deliveryToPoint: [
    {
      providerKey: "cdek",
      tariffs: [
        { tariffId: 3, deliveryCost: 200, name: "CDEK Pickup" },
      ],
    },
  ],
}

const baseOptionData = {
  id: "apiship_doortodoor",
  deliveryType: 1,
  pickupType: 1,
}

const baseContext = {
  id: "cart_01HX",
  shipping_address: {
    country_code: "RU",
    city: "Москва",
    address_1: "ул. Ленина, 1",
    province: "Московская область",
    postal_code: "101000",
  },
  from_location: {
    address: {
      country_code: "RU",
      city: "Санкт-Петербург",
      address_1: "Невский пр. 1",
      province: "Ленинградская область",
      postal_code: "190000",
    },
  },
  items: [
    {
      id: "item-01",
      quantity: 1,
      unit_price: 1000,
      variant: { weight: 500, height: 10, length: 20, width: 15 },
    },
  ],
} as any

function setupWorkflowMocks(cacheResult: any = null) {
  ;(getCalculationWorkflow as unknown as jest.Mock).mockReturnValue({
    run: jest.fn().mockResolvedValue({ result: cacheResult }),
  })
  ;(saveCalculationWorkflow as unknown as jest.Mock).mockReturnValue({
    run: jest.fn().mockResolvedValue({}),
  })
}

describe("ApishipBase.calculatePrice", () => {
  let service: any
  let apishipClient: ReturnType<typeof makeApishipClient>

  beforeEach(() => {
    jest.clearAllMocks()
    apishipClient = makeApishipClient()
    service = makeProvider(makeApishipOptions(), apishipClient)
  })
  
  it("returns cached result without calling calculator API", async () => {
    setupWorkflowMocks(mockCalculatorResponse)

    const result = await service.calculatePrice(baseOptionData, {}, baseContext)

    expect(apishipClient.calculatorApi.getCalculator).not.toHaveBeenCalled()
    expect(result.calculated_amount).toBe(300)
  })
  
  it("calls calculator API on cache miss and returns cheapest tariff price", async () => {
    setupWorkflowMocks()
    apishipClient.calculatorApi.getCalculator.mockResolvedValue({
      data: mockCalculatorResponse,
    })

    const result = await service.calculatePrice(baseOptionData, {}, baseContext)

    expect(apishipClient.calculatorApi.getCalculator).toHaveBeenCalledTimes(1)
    // cheapest in deliveryToDoor is 300
    expect(result.calculated_amount).toBe(300)
    expect(result.is_calculated_price_tax_inclusive).toBe(true)
    expect(result.data).toEqual(mockCalculatorResponse)
  })


  it("saves result to cache after a successful API call", async () => {
    const saveFn = jest.fn().mockResolvedValue({})
    setupWorkflowMocks()
    ;(saveCalculationWorkflow as unknown as jest.Mock).mockReturnValue({ run: saveFn })
    apishipClient.calculatorApi.getCalculator.mockResolvedValue({
      data: mockCalculatorResponse,
    })

    await service.calculatePrice(baseOptionData, {}, baseContext)

    expect(saveFn).toHaveBeenCalledTimes(1)
    const callArg = saveFn.mock.calls[0][0]
    expect(callArg.input.data).toEqual(mockCalculatorResponse)
    expect(typeof callArg.input.key).toBe("string")
    expect(callArg.input.key).toMatch(/^apiship:calc:/)
  })

  it("uses chosen tariff deliveryCost from data.apishipData.tariff when available", async () => {
    setupWorkflowMocks(mockCalculatorResponse)

    const dataWithTariff = {
      apishipData: {
        tariff: { tariffId: 1, deliveryCost: 999 },
      },
    }

    const result = await service.calculatePrice(baseOptionData, dataWithTariff, baseContext)

    expect(result.calculated_amount).toBe(999)
  })

  it("uses deliveryToPoint tariffs when deliveryType is 2", async () => {
    setupWorkflowMocks()
    apishipClient.calculatorApi.getCalculator.mockResolvedValue({
      data: mockCalculatorResponse,
    })

    const pointOptionData = { ...baseOptionData, id: "apiship_doortopoint", deliveryType: 2 }
    const result = await service.calculatePrice(pointOptionData, {}, baseContext)

    // cheapest in deliveryToPoint is 200
    expect(result.calculated_amount).toBe(200)
  })

  it("includes shippingOptionId in the cache key", async () => {
    let capturedKey: string | undefined
    const saveFn = jest.fn().mockImplementation(({ input }) => {
      capturedKey = input.key
      return Promise.resolve({})
    })
    setupWorkflowMocks()
    ;(saveCalculationWorkflow as unknown as jest.Mock).mockReturnValue({ run: saveFn })
    apishipClient.calculatorApi.getCalculator.mockResolvedValue({
      data: mockCalculatorResponse,
    })

    await service.calculatePrice(baseOptionData, {}, baseContext)

    expect(capturedKey).toMatch(/apiship_doortodoor$/)
  })

  it("wraps calculator API errors with context message", async () => {
    setupWorkflowMocks()
    apishipClient.calculatorApi.getCalculator.mockRejectedValue(
      new Error("Network timeout")
    )

    await expect(
      service.calculatePrice(baseOptionData, {}, baseContext)
    ).rejects.toThrow(/An error occurred in calculatePrice/)
  })
})
