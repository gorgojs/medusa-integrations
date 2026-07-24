import { http, HttpResponse } from "msw"
import { PaymentActions } from "@medusajs/framework/utils"
import YookassaService from "../../services/yookassa"
import { YOOKASSA_BASE_URL, makeLogger, server } from "./test-utils"

const baseOptions = {
  shopId: "test_shop_id",
  secretKey: "test_secret_key",
} as any

const paymentId = "payment_01HX"
const refundId = "refund_01HX"

function wrapPayload(data: Record<string, any>) {
  return { data, rawData: Buffer.from(""), headers: {} }
}

function makePaymentEvent(event: string, status: string) {
  return wrapPayload({
    type: "notification",
    event,
    object: {
      id: paymentId,
      status,
      amount: { value: "1500.00", currency: "RUB" },
      metadata: { session_id: "cart_01HX" },
    },
  })
}

// isWebhookEventValid validates by fetching the resource from YooKassa and
// comparing its current status with the event status segment.
function mockValidPayment(status: string) {
  server.use(
    http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, () =>
      HttpResponse.json({ id: paymentId, status })
    )
  )
}

function mockValidRefund(status: string) {
  server.use(
    http.get(`${YOOKASSA_BASE_URL}/refunds/${refundId}`, () =>
      HttpResponse.json({ id: refundId, status })
    )
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("YookassaBase.getWebhookActionAndData", () => {
  describe("payment.succeeded", () => {
    it("returns SUCCESSFUL action with session_id and amount when payment status matches", async () => {
      mockValidPayment("succeeded")

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await yookassa.getWebhookActionAndData(
        makePaymentEvent("payment.succeeded", "succeeded")
      )

      expect(result.action).toBe(PaymentActions.SUCCESSFUL)
      expect(result.data).toEqual({ session_id: "cart_01HX", amount: "1500.00" })
    })

    it("returns NOT_SUPPORTED when live payment status does not match the event", async () => {
      // Event says succeeded but the payment is still pending (tampered / replayed event)
      mockValidPayment("pending")

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await yookassa.getWebhookActionAndData(
        makePaymentEvent("payment.succeeded", "succeeded")
      )

      expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
    })
  })

  describe("payment.waiting_for_capture", () => {
    it("returns AUTHORIZED action when payment status matches", async () => {
      mockValidPayment("waiting_for_capture")

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await yookassa.getWebhookActionAndData(
        makePaymentEvent("payment.waiting_for_capture", "waiting_for_capture")
      )

      expect(result.action).toBe(PaymentActions.AUTHORIZED)
      expect(result.data?.session_id).toBe("cart_01HX")
    })
  })

  describe("payment.canceled", () => {
    it("returns CANCELED action when payment status matches", async () => {
      mockValidPayment("canceled")

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await yookassa.getWebhookActionAndData(
        makePaymentEvent("payment.canceled", "canceled")
      )

      expect(result.action).toBe(PaymentActions.CANCELED)
      expect(result.data?.session_id).toBe("cart_01HX")
    })
  })

  describe("refund events", () => {
    it("returns NOT_SUPPORTED for refund.succeeded (no case in switch)", async () => {
      mockValidRefund("succeeded")

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await yookassa.getWebhookActionAndData(
        wrapPayload({
          type: "notification",
          event: "refund.succeeded",
          object: {
            id: refundId,
            status: "succeeded",
            payment_id: paymentId,
          },
        })
      )

      expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
    })
  })

  describe("unknown event type", () => {
    it("returns NOT_SUPPORTED for an event not handled in switch", async () => {
      // "payment.pending" is not in the switch cases
      mockValidPayment("pending")

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await yookassa.getWebhookActionAndData(
        makePaymentEvent("payment.pending", "pending")
      )

      expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
    })
  })

  describe("isWebhookEventValid edge cases", () => {
    it("returns NOT_SUPPORTED (not throws) when the event object type is neither payment nor refund", async () => {
      // isWebhookEventValid returns false for unknown object type → default branch
      // No HTTP call is made, so no MSW handler needed
      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await yookassa.getWebhookActionAndData(
        wrapPayload({
          type: "notification",
          event: "deal.succeeded", // unknown object type
          object: { id: "deal_01", status: "succeeded" },
        })
      )

      expect(result.action).toBe(PaymentActions.NOT_SUPPORTED)
    })

    it("throws (wrapped) when the YooKassa API call fails during validation", async () => {
      server.use(
        http.get(`${YOOKASSA_BASE_URL}/payments/${paymentId}`, () =>
          HttpResponse.json(
            { type: "error", code: "not_found", description: "Payment not found" },
            { status: 404 }
          )
        )
      )

      const yookassa = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

      await expect(
        yookassa.getWebhookActionAndData(makePaymentEvent("payment.succeeded", "succeeded"))
      ).rejects.toThrow(/An error occurred in isWebhookEventValid/)
    })
  })
})
