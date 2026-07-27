import { http, HttpResponse } from "msw"
import { PaymentSessionStatus } from "@medusajs/framework/utils"
import { TKASSA_BASE_URL, makeProvider, server } from "./test-utils"

const baseOptions = {
  terminalKey: "TestTerminalKey",
  password: "test_password",
} as any

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("TkassaBase.getPaymentStatus", () => {
  // missing PaymentId
  it("throws when data.PaymentId is missing", async () => {
    const tkassa = makeProvider(baseOptions)

    await expect(
      tkassa.getPaymentStatus({ data: {} } as any)
    ).rejects.toThrow(/No payment ID provided/)
  })

  // PaymentId of wrong type
  it("throws when data.PaymentId is not a string", async () => {
    const tkassa = makeProvider(baseOptions)

    await expect(
      tkassa.getPaymentStatus({ data: { PaymentId: 12345 } } as any)
    ).rejects.toThrow(/No payment ID provided/)
  })

  // happy path with mapping
  it("maps CONFIRMED status to PaymentSessionStatus.CAPTURED", async () => {
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/GetState`, () =>
        HttpResponse.json({
          Success: true,
          ErrorCode: "0",
          PaymentId: "987654",
          OrderId: "cart_01HX",
          Status: "CONFIRMED",
          Amount: 150000,
        })
      )
    )

    const tkassa = makeProvider(baseOptions)
    const result = await tkassa.getPaymentStatus({
      data: { PaymentId: "987654" },
    } as any)

    expect(result.status).toBe(PaymentSessionStatus.CAPTURED)
  })

  // unknown status falls back to ERROR
  it("falls back to ERROR for unknown response.Status", async () => {
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/GetState`, () =>
        HttpResponse.json({
          Success: true,
          ErrorCode: "0",
          PaymentId: "987654",
          OrderId: "cart_01HX",
          Status: "SOMETHING_NEW_FROM_TKASSA",
          Amount: 150000,
        })
      )
    )

    const tkassa = makeProvider(baseOptions)
    const result = await tkassa.getPaymentStatus({
      data: { PaymentId: "987654" },
    } as any)

    expect(result.status).toBe(PaymentSessionStatus.ERROR)
  })

  // existing receipt is propagated
  it("propagates the receipt from input.data to output.data", async () => {
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/GetState`, () =>
        HttpResponse.json({
          Success: true,
          ErrorCode: "0",
          PaymentId: "987654",
          OrderId: "cart_01HX",
          Status: "AUTHORIZED",
          Amount: 150000,
        })
      )
    )

    const tkassa = makeProvider(baseOptions)
    const receipt = { FfdVersion: "1.05", Items: [] }
    const result = await tkassa.getPaymentStatus({
      data: { PaymentId: "987654", receipt },
    } as any)

    expect(result.status).toBe(PaymentSessionStatus.AUTHORIZED)
    expect((result.data as any).receipt).toEqual(receipt)
  })
})
