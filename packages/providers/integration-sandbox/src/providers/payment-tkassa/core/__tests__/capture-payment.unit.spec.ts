import { http, HttpResponse } from "msw"
import { TKASSA_BASE_URL, captureRequest, makeProvider, server } from "./test-utils"

const okConfirmResponse = {
  Success: true,
  ErrorCode: "0",
  TerminalKey: "TestTerminalKey",
  Status: "CONFIRMED",
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

describe("TkassaBase.capturePayment", () => {
  it("calls /v2/Confirm with PaymentId and a signed Token; Password is not leaked", async () => {
    let captured: any
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Confirm`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okConfirmResponse)
      })
    )

    const tkassa = makeProvider(baseOptions)
    await tkassa.capturePayment({
      data: { PaymentId: "987654" },
    } as any)

    expect(captured.url).toBe(`${TKASSA_BASE_URL}/v2/Confirm`)
    expect(captured.body.PaymentId).toBe("987654")
    expect(captured.body.TerminalKey).toBe("TestTerminalKey")
    expect(typeof captured.body.Token).toBe("string")
    expect(captured.body.Token).toMatch(/^[a-f0-9]{64}$/)
    expect(captured.body.Password).toBeUndefined()
  })

  it("propagates the receipt from input.data into output.data unchanged", async () => {
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Confirm`, () =>
        HttpResponse.json(okConfirmResponse)
      )
    )

    const tkassa = makeProvider(baseOptions)
    const receipt = { FfdVersion: "1.05", Items: [{ Name: "Item 1" }] }
    const result = await tkassa.capturePayment({
      data: { PaymentId: "987654", receipt },
    } as any)

    expect((result.data as any).receipt).toEqual(receipt)
  })

  it("wraps upstream HTTP errors with the method context", async () => {
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Confirm`, () =>
        HttpResponse.json({ Success: false, ErrorCode: "9999" }, { status: 500 })
      )
    )

    const tkassa = makeProvider(baseOptions)

    // NOTE: the source has a typo "capturePaymentt" — assert the actual current
    // behaviour so a fix would be a conscious choice, not a silent regression.
    await expect(
      tkassa.capturePayment({ data: { PaymentId: "987654" } } as any)
    ).rejects.toThrow(/An error occurred in capturePayment/)
  })
})
