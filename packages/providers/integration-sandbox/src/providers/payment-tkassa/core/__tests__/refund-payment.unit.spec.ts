import { http, HttpResponse } from "msw"
import { TKASSA_BASE_URL, captureRequest, makeProvider, server } from "./test-utils"

const okCancelResponse = {
  Success: true,
  ErrorCode: "0",
  TerminalKey: "TestTerminalKey",
  Status: "REFUNDED",
  PaymentId: 987654,
  OrderId: "cart_01HX",
}

const baseOptions = {
  terminalKey: "TestTerminalKey",
  password: "test_password",
} as any

const initialReceipt = {
  FfdVersion: "1.05",
  Taxation: "osn",
  Items: [
    {
      Name: "Item 1",
      Price: 150000,
      Quantity: 1,
      Amount: 150000,
      Tax: "none",
      PaymentMethod: "full_payment",
      PaymentObject: "commodity",
    },
  ],
} as any

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("TkassaBase.refundPayment", () => {
  // Full refund — receipt is omitted, Amount is set
  it("full refund (refundAmount === data.amount) omits Receipt and sets Amount in kopecks", async () => {
    let captured: any
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Cancel`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCancelResponse)
      })
    )

    const tkassa = makeProvider(baseOptions)
    const data = {
      PaymentId: "987654",
      OrderId: "cart_01HX",
      amount: 150000, // smallest unit, equal to the refund amount converted
      receipt: initialReceipt,
    }

    await tkassa.refundPayment({ amount: 1500, data } as any)

    expect(captured.url).toBe(`${TKASSA_BASE_URL}/v2/Cancel`)
    expect(captured.body.PaymentId).toBe("987654")
    expect(captured.body.Amount).toBe(150000) // RUB → kopecks
    expect(captured.body.Receipt).toBeUndefined() // Full refund: no Receipt
    expect(captured.body.Password).toBeUndefined()
    expect(typeof captured.body.Token).toBe("string")
  })

  // Partial refund — receipt is sent
  it("partial refund (refundAmount !== data.amount) includes Receipt and Amount in kopecks", async () => {
    let captured: any
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Cancel`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCancelResponse)
      })
    )

    const tkassa = makeProvider(baseOptions)
    const data = {
      PaymentId: "987654",
      OrderId: "cart_01HX",
      amount: 150000, // payment had 1500.00 RUB
      receipt: initialReceipt,
    }

    await tkassa.refundPayment({ amount: 500, data } as any) // refunding only 500 RUB

    expect(captured.body.Amount).toBe(50000) // 500 RUB → 50000 kopecks
    expect(captured.body.Receipt).toBeDefined()
    expect(captured.body.Receipt.Items).toHaveLength(1)
    expect(captured.body.Receipt.Items[0].Name).toBe("Refund for Order cart_01HX")
    expect(captured.body.Receipt.Items[0].Amount).toBe(50000)
    expect(captured.body.Receipt.Items[0].Price).toBe(50000)
    expect(captured.body.Receipt.Items[0].Quantity).toBe(1)
  })

  it("accepts BigNumberInput-shaped amount and converts its `value` to kopecks", async () => {
    let captured: any
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Cancel`, async ({ request }) => {
        captured = await captureRequest(request)
        return HttpResponse.json(okCancelResponse)
      })
    )

    const tkassa = makeProvider(baseOptions)
    const data = {
      PaymentId: "987654",
      OrderId: "cart_01HX",
      amount: 150000,
      receipt: initialReceipt,
    }

    await tkassa.refundPayment({ amount: { value: "750" }, data } as any)

    expect(captured.body.Amount).toBe(75000) // 750 RUB → 75000 kopecks
  })

  it("wraps upstream errors", async () => {
    server.use(
      http.post(`${TKASSA_BASE_URL}/v2/Cancel`, () =>
        HttpResponse.json({ Success: false, ErrorCode: "9999" }, { status: 500 })
      )
    )

    const tkassa = makeProvider(baseOptions)
    const data = {
      PaymentId: "987654",
      OrderId: "cart_01HX",
      amount: 150000,
      receipt: initialReceipt,
    }

    await expect(
      tkassa.refundPayment({ amount: 1500, data } as any)
    ).rejects.toThrow(/An error occurred in refundPayment/)
  })

  // Documents a defensive gap in tkassa-base.refundPayment: generateRefundReceipt
  // is called unconditionally BEFORE the try/catch, so a missing data.receipt
  // crashes with an unwrapped TypeError instead of a friendly provider error.
  // If/when the source is hardened, this assertion will need updating.
  it("throws (unwrapped) when data.receipt is missing — no guard around generateRefundReceipt", async () => {
    const tkassa = makeProvider(baseOptions)

    await expect(
      tkassa.refundPayment({
        amount: 1500,
        data: { PaymentId: "987654", OrderId: "cart_01HX", amount: 150000 }, // no receipt
      } as any)
    ).rejects.toThrow(/Cannot read properties of undefined/)
  })
})
