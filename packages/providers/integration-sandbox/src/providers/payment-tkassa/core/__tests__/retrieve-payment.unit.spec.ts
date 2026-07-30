import { http, HttpResponse } from "msw"
import { TKASSA_BASE_URL, captureRequest, makeProvider, server } from "./test-utils"

const okGetStateResponse = {
  Success: true,
  ErrorCode: "0",
  TerminalKey: "TestTerminalKey",
  Status: "CONFIRMED",
  PaymentId: 987654,
  OrderId: "cart_01HX",
  Amount: 150000,
}

const baseOptions = {
  terminalKey: "TestTerminalKey",
  password: "test_password",
} as any

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("TkassaBase.retrievePayment", () => {
  it("calls /v2/GetState with PaymentId and signed Token, returns the upstream payload", async () => {
    let captured: any
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/GetState`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okGetStateResponse)
      })
    )

    const tkassa = makeProvider(baseOptions)
    const result = await tkassa.retrievePayment({
      data: { PaymentId: "987654" },
    } as any)

    expect(captured.url).toBe(`${TKASSA_BASE_URL}/v2/GetState`)
    expect(captured.body.PaymentId).toBe("987654")
    expect(captured.body.TerminalKey).toBe("TestTerminalKey")
    expect(captured.body.Password).toBeUndefined()
    expect(typeof captured.body.Token).toBe("string")

    expect((result.data as any).Status).toBe("CONFIRMED")
    expect((result.data as any).PaymentId).toBe(987654)
  })

  it("propagates receipt from input.data into output.data", async () => {
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/GetState`, () =>
        HttpResponse.json(okGetStateResponse)
      )
    )

    const tkassa = makeProvider(baseOptions)
    const receipt = { FfdVersion: "1.05", Items: [] }
    const result = await tkassa.retrievePayment({
      data: { PaymentId: "987654", receipt },
    } as any)

    expect((result.data as any).receipt).toEqual(receipt)
  })

  it("wraps upstream HTTP errors with a clear message", async () => {
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/GetState`, () =>
        HttpResponse.json({ Success: false, ErrorCode: "9999" }, { status: 500 })
      )
    )

    const tkassa = makeProvider(baseOptions)

    await expect(
      tkassa.retrievePayment({ data: { PaymentId: "987654" } } as any)
    ).rejects.toThrow(/An error occurred in retrievePayment/)
  })
})
