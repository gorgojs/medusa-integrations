import { fetchShipmentDocuments, needsShipmentDocumentsSync } from "../shipment-documents"
import { makeApishipClient } from "../../providers/fulfillment-apiship/core/__tests__/test-utils"

function makeLogger() {
  return { debug: jest.fn(), error: jest.fn() }
}

describe("needsShipmentDocumentsSync", () => {
  it("is false when there is no orderId — nothing to fetch", () => {
    expect(needsShipmentDocumentsSync({ data: {}, labels: [] })).toBe(false)
  })

  it("is true when there is an orderId but no labels yet", () => {
    expect(needsShipmentDocumentsSync({ data: { orderId: 1 }, labels: [] })).toBe(true)
  })

  it("is true when a label was saved (tracking only) but has no label_url yet", () => {
    expect(
      needsShipmentDocumentsSync({
        data: { orderId: 1 },
        labels: [{ label_url: "" }],
      })
    ).toBe(true)
  })

  it("is false once a label with a label_url exists", () => {
    expect(
      needsShipmentDocumentsSync({
        data: { orderId: 1 },
        labels: [{ label_url: "https://api.apiship.ru/labels/1.pdf" }],
      })
    ).toBe(false)
  })
})

describe("fetchShipmentDocuments", () => {
  it("returns labels when ready on the first attempt", async () => {
    const apishipClient = makeApishipClient() as any
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "CDEK-123", trackingUrl: "https://track.cdek.ru/123" } },
    })
    apishipClient.orderDocsApi.getLabels.mockResolvedValue({
      data: { url: "https://api.apiship.ru/labels/9999.pdf" },
    })

    const labels = await fetchShipmentDocuments({
      apishipClient,
      orderId: 9999,
      logger: makeLogger(),
      sleep: jest.fn().mockResolvedValue(undefined),
    })

    expect(labels).toEqual([
      {
        tracking_number: "CDEK-123",
        tracking_url: "https://track.cdek.ru/123",
        label_url: "https://api.apiship.ru/labels/9999.pdf",
      },
    ])
  })

  it("skips the label lookup entirely when waitForLabel is false", async () => {
    const apishipClient = makeApishipClient() as any
    apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
      data: { order: { providerNumber: "CDEK-123", trackingUrl: "https://track.cdek.ru/123" } },
    })
    const sleep = jest.fn().mockResolvedValue(undefined)

    const labels = await fetchShipmentDocuments({
      apishipClient,
      orderId: 9999,
      logger: makeLogger(),
      waitForLabel: false,
      sleep,
    })

    expect(apishipClient.orderDocsApi.getLabels).not.toHaveBeenCalled()
    expect(sleep).not.toHaveBeenCalled()
    expect(labels).toEqual([
      {
        tracking_number: "CDEK-123",
        tracking_url: "https://track.cdek.ru/123",
        label_url: "",
      },
    ])
  })

  describe("maxAttempts override", () => {
    it("makes only one attempt when maxAttempts=1, without sleeping", async () => {
      const apishipClient = makeApishipClient() as any
      apishipClient.ordersApi.getOrderInfo.mockResolvedValue({ data: { order: {} } })
      apishipClient.orderDocsApi.getLabels.mockResolvedValue({ data: { url: "" } })
      const sleep = jest.fn().mockResolvedValue(undefined)

      await expect(
        fetchShipmentDocuments({
          apishipClient,
          orderId: 1,
          logger: makeLogger(),
          maxAttempts: 1,
          sleep,
        })
      ).rejects.toThrow(/data not ready after 1 attempts/)

      expect(apishipClient.ordersApi.getOrderInfo).toHaveBeenCalledTimes(1)
      expect(sleep).not.toHaveBeenCalled()
    })

    it("succeeds immediately with maxAttempts=1 when the order is already ready", async () => {
      const apishipClient = makeApishipClient() as any
      apishipClient.ordersApi.getOrderInfo.mockResolvedValue({
        data: { order: { providerNumber: "CDEK-1", trackingUrl: "" } },
      })
      apishipClient.orderDocsApi.getLabels.mockResolvedValue({
        data: { url: "https://api.apiship.ru/labels/1.pdf" },
      })

      const labels = await fetchShipmentDocuments({
        apishipClient,
        orderId: 1,
        logger: makeLogger(),
        maxAttempts: 1,
        sleep: jest.fn(),
      })

      expect(labels[0].label_url).toBe("https://api.apiship.ru/labels/1.pdf")
    })

    it("falls back to 10 attempts when maxAttempts is not provided", async () => {
      const apishipClient = makeApishipClient() as any
      apishipClient.ordersApi.getOrderInfo.mockResolvedValue({ data: { order: {} } })
      const sleep = jest.fn().mockResolvedValue(undefined)

      await expect(
        fetchShipmentDocuments({
          apishipClient,
          orderId: 1,
          logger: makeLogger(),
          sleep,
        })
      ).rejects.toThrow(/data not ready after 10 attempts/)

      expect(apishipClient.ordersApi.getOrderInfo).toHaveBeenCalledTimes(10)
    })
  })
})
