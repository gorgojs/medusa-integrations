/**
 * Live contract tests against the Mollie API with a test API key.
 *
 * Purpose: catch what the nock-backed suites cannot see, by running the plugin's own provider and
 * client (from the built package) against Mollie: the shape of the payment body Mollie accepts, the
 * `checkout_url` it returns, Mollie's refusal to cancel an open payment, `captureMode: manual`, and the
 * responses the SDK validates. No nock here: every call reaches https://api.mollie.com.
 *
 * Opt-in: skipped unless CI_MOLLIE_API_KEY is set to a test key (it starts with `test_`). A live key
 * is never used, so a mistake here cannot move money.
 *
 *   CI_MOLLIE_API_KEY=test_… yarn test:integration:http mollie-sandbox
 *
 * A payment stays `open` until a buyer pays it on Mollie's page, which needs a browser, so the
 * refund of a paid payment is a manual step of the plan.
 */
import { randomBytes } from "node:crypto"
import { getMollie } from "@gorgo/medusa-payment-mollie/lib/mollie-client"
import paymentProvider from "@gorgo/medusa-payment-mollie/providers/payment-mollie"

jest.setTimeout(90 * 1000)

const API_KEY = process.env.CI_MOLLIE_API_KEY
const describeIfKey = API_KEY?.startsWith("test_") ? describe : describe.skip

const silent = { debug() {}, info() {}, warn() {}, error() {} } as any

const MollieService = (paymentProvider as any).services[0]

const WEBHOOK_URL = "https://api.example.com/hooks/payment/mollie_mollie"
const REDIRECT_URL = "https://shop.example.com/api/payment-return?provider=mollie"

/** A Medusa session id: `payses_` and 26 characters of the ULID alphabet. */
function sessionId() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
  return `payses_${Array.from(randomBytes(26), (b) => alphabet[b % 32]).join("")}`
}

function makeProvider(capture: "automatic" | "manual") {
  const provider = new MollieService({ logger: silent }, { id: "contract" })
  provider.resolveOptions = async () => ({ apiKey: API_KEY!, webhookUrl: WEBHOOK_URL, capture })
  provider.getPaymentCollectionId = async () => "pay_col_contract"
  provider.getMollieCart = async () => ({
    id: "cart_contract",
    email: "contract@example.com",
    billing_address: {
      first_name: "Contract",
      last_name: "Test",
      address_1: "Keizersgracht 126",
      city: "Amsterdam",
      postal_code: "1015 CW",
      country_code: "nl",
    },
    shipping_address: {
      first_name: "Contract",
      last_name: "Test",
      address_1: "Prinsengracht 2",
      city: "Amsterdam",
      postal_code: "1015 DV",
      country_code: "nl",
    },
  })
  return provider
}

describeIfKey("Mollie API contract (test key)", () => {
  it("reads the website profile the test key belongs to", async () => {
    const profile = await getMollie(API_KEY!).profiles.getCurrent()

    expect(profile.resource).toBe("profile")
    // the profile's own mode, which the sandbox reports as `live` for a test key: testConnection
    // takes the mode from the key's prefix instead
    expect(["live", "test"]).toContain(profile.mode)
    expect(profile.id).toMatch(/^pfl_/)
    expect(profile.name).toEqual(expect.any(String))
    expect(profile.status).toEqual(expect.any(String))
  })

  it("creates a 10.00 EUR payment with a checkout URL, which Mollie refuses to cancel while open", async () => {
    const provider = makeProvider("automatic")
    const id = sessionId()

    const created = await provider.initiatePayment({
      amount: 10,
      currency_code: "eur",
      data: { session_id: id, redirect_url: REDIRECT_URL },
      context: { idempotency_key: id },
    })

    expect(created.id).toMatch(/^tr_[A-Za-z0-9]+$/)
    expect(created.data).toMatchObject({
      id: created.id,
      status: "open",
      mode: "test",
      amount: 10,
      currency_code: "eur",
      session_id: id,
      // Mollie leaves captureMode out of an automatic payment
      capture_mode: null,
    })
    expect(created.data.checkout_url).toMatch(/^https:\/\/www\.mollie\.com\/checkout\//)
    expect(created.data.expires_at).toEqual(expect.any(String))

    const read = await getMollie(API_KEY!).payments.get({ paymentId: created.id })
    expect(read.amount).toEqual({ currency: "EUR", value: "10.00" })
    expect(read.metadata).toMatchObject({ session_id: id, cart_id: "cart_contract" })
    expect(read.webhookUrl).toBe(WEBHOOK_URL)
    expect(read.redirectUrl).toBe(REDIRECT_URL)

    // an open payment the buyer has picked no method for: Mollie answers 422, the provider keeps it
    await expect(getMollie(API_KEY!).payments.cancel({ paymentId: created.id })).rejects.toMatchObject({ statusCode: 422 })
    const kept = await provider.cancelPayment({ data: created.data })
    expect(kept.data).toMatchObject({ id: created.id, status: "open" })
    const after = await getMollie(API_KEY!).payments.get({ paymentId: created.id })
    expect(after.status).toBe("open")
  })

  it("creates a payment with captureMode manual, which Mollie refuses to cancel while open", async () => {
    const provider = makeProvider("manual")
    const id = sessionId()

    const created = await provider.initiatePayment({
      amount: 10,
      currency_code: "eur",
      data: { session_id: id, redirect_url: REDIRECT_URL },
      context: { idempotency_key: id },
    })

    expect(created.data).toMatchObject({ status: "open", capture_mode: "manual" })
    const read = await getMollie(API_KEY!).payments.get({ paymentId: created.id })
    expect(read.captureMode).toBe("manual")

    const kept = await provider.cancelPayment({ data: created.data })
    expect(kept.data).toMatchObject({ id: created.id, status: "open" })
  })
})
