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

describe("ApishipBase.pickTariffId", () => {
  let service: any
  let apishipClient: ReturnType<typeof makeApishipClient>

  beforeEach(() => {
    jest.clearAllMocks()
    apishipClient = makeApishipClient()
    service = makeProvider(undefined, apishipClient)
  })

  it("returns the numeric id from the first matching tariff", async () => {
    apishipClient.listsApi.getListTariffs.mockResolvedValue({
      data: {
        rows: [
          { id: 42, tariffId: 100, providerKey: "cdek", name: "CDEK Express" },
          { id: 43, tariffId: 101, providerKey: "cdek", name: "CDEK Standard" },
        ],
      },
    })

    const result = await service.pickTariffId("cdek")

    expect(result).toBe(42)
  })

  it("calls getListTariffs with providerKey filter and required fields", async () => {
    apishipClient.listsApi.getListTariffs.mockResolvedValue({
      data: { rows: [{ id: 1, tariffId: 1, providerKey: "cdek", name: "Test" }] },
    })

    await service.pickTariffId("cdek")

    const callArg = apishipClient.listsApi.getListTariffs.mock.calls[0][0]
    expect(callArg.filter).toMatch(/providerKey=cdek/)
    expect(callArg.fields).toMatch(/id/)
  })

  it("throws when no tariffs are returned", async () => {
    apishipClient.listsApi.getListTariffs.mockResolvedValue({
      data: { rows: [] },
    })

    await expect(service.pickTariffId("cdek")).rejects.toThrow(
      /No current tariffs found for ProviderKey=cdek/
    )
  })

  it("throws when rows is undefined (API returns no rows key)", async () => {
    apishipClient.listsApi.getListTariffs.mockResolvedValue({
      data: {},
    })

    await expect(service.pickTariffId("cdek")).rejects.toThrow(/No current tariffs found/)
  })

  it("throws when first tariff has no id", async () => {
    apishipClient.listsApi.getListTariffs.mockResolvedValue({
      data: { rows: [{ tariffId: 99, providerKey: "cdek", name: "Test" }] }, // no id
    })

    await expect(service.pickTariffId("cdek")).rejects.toThrow(
      /Failed to retrieve tariffId/
    )
  })

  it("converts id to number via Number()", async () => {
    apishipClient.listsApi.getListTariffs.mockResolvedValue({
      data: { rows: [{ id: "77", tariffId: 1, providerKey: "cdek", name: "Test" }] },
    })

    const result = await service.pickTariffId("cdek")

    expect(result).toBe(77)
    expect(typeof result).toBe("number")
  })

  it("still resolves when getListTariffs throws (catches internally), then throws no-tariffs error", async () => {
    apishipClient.listsApi.getListTariffs.mockRejectedValue(new Error("API down"))

    await expect(service.pickTariffId("cdek")).rejects.toThrow(/No current tariffs found/)
  })
})
