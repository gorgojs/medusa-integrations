/**
 * Live consumer-driven contract tests against YooKassa (https://api.yookassa.ru/v3).
 *
 * Purpose: catch breaking changes in the YooKassa API (renamed/removed fields,
 * status changes, schema diffs in success and error responses) that mocked
 * unit/contract tests by design cannot detect. Validates request/response
 * shapes for the endpoints the plugin actually depends on.
 *
 * These tests are OPT-IN, split into two suites based on shop configuration:
 *
 *   Suite A — shop WITHOUT mandatory receipt generation:
 *     CI_YOOKASSA_SHOP_ID + CI_YOOKASSA_SECRET_KEY
 *
 *   Suite B — shop WITH mandatory receipt generation (54-FZ):
 *     CI_YOOKASSA_WITH_RECEIPT_SHOP_ID + CI_YOOKASSA_WITH_RECEIPT_SECRET_KEY
 *
 * Each suite is skipped unless its own env vars are set. Both can run together.
 *
 * NOTE: the YooKassa client wraps axios errors via errorFactory:
 *   Object.assign(new ErrorResponse(), axiosError)
 * The YooKassa error body (type/code/description) lives in e.response.data,
 * not on the top-level thrown object.
 */
import { YooCheckout } from "@gorgo/medusa-payment-yookassa/lib/yookassa-client"

jest.setTimeout(60 * 1000)

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------
const SHOP_ID = process.env.CI_YOOKASSA_SHOP_ID
const SECRET_KEY = process.env.CI_YOOKASSA_SECRET_KEY
const HAS_CREDS = Boolean(SHOP_ID && SECRET_KEY)

const RECEIPT_SHOP_ID = process.env.CI_YOOKASSA_WITH_RECEIPT_SHOP_ID
const RECEIPT_SECRET_KEY = process.env.CI_YOOKASSA_WITH_RECEIPT_SECRET_KEY
const HAS_RECEIPT_CREDS = Boolean(RECEIPT_SHOP_ID && RECEIPT_SECRET_KEY)

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// Set of statuses currently mapped in the plugin. If YooKassa introduces a new
// lifecycle status, getPaymentStatus / getWebhookActionAndData fall back to
// PENDING — this guard surfaces that.
const KNOWN_STATUSES = [
  "pending",
  "waiting_for_capture",
  "succeeded",
  "canceled",
] as const

// The SDK wraps AxiosError via Object.assign(new ErrorResponse(), axiosError).
// The YooKassa error body lives at e.response.data, not on the top-level object.
// This helper re-throws with the actual API error message so failures are readable.
async function sdkCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e: any) {
    const body = e?.response?.data
    throw new Error(
      body
        ? `YooKassa API error ${e.response.status}: [${body.code}] ${body.description}`
        : `SDK threw without response: ${JSON.stringify(e)}`
    )
  }
}

// Best-effort cleanup; not all states accept cancel, so don't fail the test.
async function tryCancel(client: YooCheckout, paymentId: string | undefined) {
  if (!paymentId) return
  try {
    await client.cancelPayment(paymentId)
  } catch {
    // ignore — payment may already be in a terminal state
  }
}

// ---------------------------------------------------------------------------
// Suite A — shop WITHOUT mandatory receipt generation
// ---------------------------------------------------------------------------
;(HAS_CREDS ? describe : describe.skip)(
  "YooKassa contract — shop without mandatory receipt (LIVE network)",
  () => {
    let client: YooCheckout

    beforeAll(() => {
      client = new YooCheckout({ shopId: SHOP_ID!, secretKey: SECRET_KEY! })
    })

    it("createPayment → getPayment → cancelPayment honours the documented lifecycle contract", async () => {
      const idempotencyKey = `contract-no-receipt-${Date.now()}`
      const payment = await sdkCall(() =>
        client.createPayment(
          {
            amount: { value: "10.00", currency: "RUB" },
            confirmation: { type: "redirect", return_url: "https://example.com/return" },
            description: "medusa-plugin contract test (no receipt)",
            metadata: { session_id: idempotencyKey, receip_tmp: "{}" },
          },
          idempotencyKey
        )
      )

      expect(payment.id).toBeDefined()
      expect(payment.status).toBeDefined()
      expect(KNOWN_STATUSES).toContain(payment.status as any)
      expect(payment.amount.value).toBe("10.00")
      expect(payment.amount.currency).toBe("RUB")
      expect(payment.confirmation).toBeDefined()
      expect((payment.confirmation as any).confirmation_url).toMatch(/^https:\/\//)
      // Both metadata fields must be echoed back: session_id routes webhooks to
      // the correct Medusa payment session; receip_tmp carries the receipt
      // template used by refundPayment to build partial refund receipts.
      expect((payment.metadata as any).session_id).toBe(idempotencyKey)
      expect((payment.metadata as any).receip_tmp).toBe("{}")

      const fetched = await sdkCall(() => client.getPayment(payment.id))
      expect(fetched.id).toBe(payment.id)
      expect(fetched.amount.value).toBe("10.00")
      expect(KNOWN_STATUSES).toContain(fetched.status as any)
      expect((fetched.metadata as any).session_id).toBe(idempotencyKey)
      expect((fetched.metadata as any).receip_tmp).toBe("{}")

      await tryCancel(client, payment.id)
    })

    it("getPayment on a non-existent ID returns a structured error (error response contract)", async () => {
      // The plugin's buildError reads error.response?.data?.code / description to
      // compose its message. If YooKassa changes the error response shape,
      // buildError silently produces less helpful messages in production.
      //
      // SDK error shape: the YooKassa client throws
      //   Object.assign(new ErrorResponse(), axiosError)
      // so the YooKassa error body lives at e.response.data, not on the top level.
      const FAKE_ID = "00000000-0000-0000-0000-000000000000"

      let errorData: any
      try {
        await client.getPayment(FAKE_ID)
      } catch (e: any) {
        errorData = e?.response?.data
      }

      expect(errorData).toBeDefined()
      // YooKassa error responses carry type, id, code, description.
      expect(errorData.type).toBe("error")
      expect(typeof errorData.code).toBe("string")
      expect(errorData.code).not.toBe("")
      expect(errorData.description).toBeDefined()
    })
  }
)

// ---------------------------------------------------------------------------
// Suite B — shop WITH mandatory receipt generation (54-FZ)
// ---------------------------------------------------------------------------
;(HAS_RECEIPT_CREDS ? describe : describe.skip)(
  "YooKassa contract — shop with mandatory receipt / 54-FZ (LIVE network)",
  () => {
    let client: YooCheckout

    beforeAll(() => {
      client = new YooCheckout({
        shopId: RECEIPT_SHOP_ID!,
        secretKey: RECEIPT_SECRET_KEY!,
      })
    })

    it("createPayment with receipt → getPayment → cancelPayment honours lifecycle and receipt schema contract", async () => {
      // High-risk surface: FNS-driven receipt schema changes break production
      // payments silently. Validates that YooKassa still accepts the exact shape
      // generateReceipt produces AND that metadata is echoed back correctly.
      const idempotencyKey = `contract-with-receipt-${Date.now()}`
      const payment = await sdkCall(() =>
        client.createPayment(
          {
            amount: { value: "10.00", currency: "RUB" },
            confirmation: { type: "redirect", return_url: "https://example.com/return" },
            description: "medusa-plugin contract test (with receipt)",
            metadata: { session_id: idempotencyKey, receip_tmp: "{}" },
            receipt: {
              customer: { email: "buyer@example.com" },
              items: [
                {
                  description: "Contract test item",
                  quantity: "1",
                  amount: { value: "10.00", currency: "RUB" },
                  vat_code: 1,
                  payment_subject: "commodity",
                  payment_mode: "full_payment",
                },
              ],
            } as any,
          },
          idempotencyKey
        )
      )

      expect(payment.id).toBeDefined()
      expect(KNOWN_STATUSES).toContain(payment.status as any)
      expect(payment.amount.value).toBe("10.00")
      expect(payment.amount.currency).toBe("RUB")
      expect(payment.confirmation).toBeDefined()
      expect((payment.confirmation as any).confirmation_url).toMatch(/^https:\/\//)
      // Both metadata fields must be echoed back: session_id routes webhooks to
      // the correct Medusa payment session; receip_tmp carries the receipt
      // template used by refundPayment to build partial refund receipts.
      expect((payment.metadata as any).session_id).toBe(idempotencyKey)
      expect((payment.metadata as any).receip_tmp).toBe("{}")

      const fetched = await sdkCall(() => client.getPayment(payment.id))
      expect(fetched.id).toBe(payment.id)
      expect(KNOWN_STATUSES).toContain(fetched.status as any)
      expect((fetched.metadata as any).session_id).toBe(idempotencyKey)
      expect((fetched.metadata as any).receip_tmp).toBe("{}")

      await tryCancel(client, payment.id)
    })

    it("createPayment without receipt is rejected (mandatory-receipt shop error contract)", async () => {
      // Validates that the YooKassa API enforces the fiscal receipt requirement
      // and that the error response shape matches what the plugin's buildError expects.
      const idempotencyKey = `contract-missing-receipt-${Date.now()}`

      let errorData: any
      try {
        await client.createPayment(
          {
            amount: { value: "10.00", currency: "RUB" },
            confirmation: { type: "redirect", return_url: "https://example.com/return" },
            description: "medusa-plugin contract test (should fail — no receipt)",
          },
          idempotencyKey
        )
      } catch (e: any) {
        errorData = e?.response?.data
      }

      expect(errorData).toBeDefined()
      expect(errorData.type).toBe("error")
      expect(typeof errorData.code).toBe("string")
      expect(errorData.code).not.toBe("")
      expect(errorData.description).toBeDefined()
    })
  }
)

if (!HAS_CREDS && !HAS_RECEIPT_CREDS) {
  describe.skip("YooKassa contract (LIVE network)", () => {
    it.skip(
      "skipped: set CI_YOOKASSA_SHOP_ID / CI_YOOKASSA_SECRET_KEY (shop without mandatory receipts) " +
        "or CI_YOOKASSA_WITH_RECEIPT_SHOP_ID / CI_YOOKASSA_WITH_RECEIPT_SECRET_KEY (shop with mandatory receipts)",
      () => {}
    )
  })
}
