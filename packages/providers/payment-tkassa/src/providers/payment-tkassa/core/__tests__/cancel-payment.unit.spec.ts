import { http, HttpResponse } from "msw"
import TkassaService from "../../services/tkassa"
import { TKASSA_BASE_URL, captureRequest, makeLogger, server } from "./test-utils"

const okCancelResponse = {
  Success: true,
  ErrorCode: "0",
  TerminalKey: "TestTerminalKey",
  Status: "CANCELED",
  PaymentId: 987654,
  OrderId: "cart_01HX",
}

const baseOptions = {
  terminalKey: "TestTerminalKey",
  password: "test_password",
} as any

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("TkassaBase.cancelPayment", () => {
  it("calls /v2/Cancel with PaymentId, NO Amount, NO Receipt (full void)", async () => {
    let captured: any
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Cancel`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCancelResponse)
      })
    )

    const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
    await tkassa.cancelPayment({
      data: { PaymentId: "987654" },
    } as any)

    expect(captured.url).toBe(`${TKASSA_BASE_URL}/v2/Cancel`)
    expect(captured.body.PaymentId).toBe("987654")
    expect(captured.body.TerminalKey).toBe("TestTerminalKey")
    expect(typeof captured.body.Token).toBe("string")
    expect(captured.body.Password).toBeUndefined()

    // cancelPayment is a full void — it must not pass Amount or Receipt.
    expect(captured.body.Amount).toBeUndefined()
    expect(captured.body.Receipt).toBeUndefined()
  })

  it("propagates the receipt from input.data into output.data (not into the request)", async () => {
    let captured: any
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Cancel`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCancelResponse)
      })
    )

    const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
    const receipt = { FfdVersion: "1.05", Items: [{ Name: "Item 1" }] }
    const result = await tkassa.cancelPayment({
      data: { PaymentId: "987654", receipt },
    } as any)

    expect(captured.body.Receipt).toBeUndefined()
    expect((result.data as any).receipt).toEqual(receipt)
  })

  it("wraps upstream HTTP errors with a clear message", async () => {
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Cancel`, () =>
        HttpResponse.json({ Success: false, ErrorCode: "9999" }, { status: 500 })
      )
    )

    const tkassa = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)

    await expect(
      tkassa.cancelPayment({ data: { PaymentId: "987654" } } as any)
    ).rejects.toThrow(/An error occurred in cancelPayment/)
  })
})
