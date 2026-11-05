/**
 * Live contract tests against an Authorize.net sandbox account.
 *
 * Purpose: catch what the nock-backed suites cannot see, by running the plugin's own provider and
 * client (from the built package) against the sandbox: the element order the JSON endpoint expects,
 * the 33-character refId, the status after each transaction, a void before settlement, a decline.
 * The token comes from securePaymentContainerRequest, which stands in for Accept.js in a browser.
 *
 * Opt-in: skipped unless CI_AUTHORIZENET_API_LOGIN_ID and CI_AUTHORIZENET_TRANSACTION_KEY are set to
 * sandbox keys of an account in Live Mode (Test Mode keeps no transactions).
 *
 *   yarn test:integration:http authorizenet-sandbox
 *
 * Settlement runs once a day, so a refund after settlement cannot be checked in one run: the plan's
 * manual step refunds a transaction from this suite the next day.
 */
import { randomBytes } from "node:crypto"
import { MedusaError, PaymentSessionStatus } from "@medusajs/framework/utils"
import { AuthorizeNetClient } from "@gorgo/medusa-payment-authorizenet/lib/authorizenet-client"
import paymentProvider from "@gorgo/medusa-payment-authorizenet/providers/payment-authorizenet"
import integrationProvider from "@gorgo/medusa-payment-authorizenet/providers/integration-authorizenet"

jest.setTimeout(90 * 1000)

const API_LOGIN_ID = process.env.CI_AUTHORIZENET_API_LOGIN_ID
const TRANSACTION_KEY = process.env.CI_AUTHORIZENET_TRANSACTION_KEY
const CLIENT_KEY = process.env.CI_AUTHORIZENET_CLIENT_KEY

const describeIfKeys = API_LOGIN_ID && TRANSACTION_KEY ? describe : describe.skip

const silent = { debug() {}, info() {}, warn() {}, error() {} } as any

const AuthorizeNetService = (paymentProvider as any).services[0]
const AuthorizeNetIntegrationProvider = (integrationProvider as any).services[0]

const options = (capture: "automatic" | "manual") => ({
  environment: "sandbox",
  apiLoginId: API_LOGIN_ID!,
  transactionKey: TRANSACTION_KEY!,
  publicClientKey: CLIENT_KEY ?? "",
  capture,
  googlePay: false,
})

/** A Medusa session id: `payses_` and 26 characters of the ULID alphabet, 33 in all. */
function sessionId() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
  return `payses_${Array.from(randomBytes(26), (b) => alphabet[b % 32]).join("")}`
}

/** A different amount each time: Authorize.net refuses a repeat of the same card and amount for 120 s. */
const amount = () => Number((1 + Math.random() * 90).toFixed(2))

function makeProvider(capture: "automatic" | "manual", zip = "46201") {
  const provider = new AuthorizeNetService({ logger: silent }, { id: "contract" })
  provider.resolveOptions = async () => options(capture)
  provider.getPaymentCollectionId = async () => "pay_col_contract"
  provider.getAuthorizeNetCart = async () => ({
    id: "cart_contract",
    email: "contract@example.com",
    billing_address: {
      first_name: "Contract",
      last_name: "Test",
      address_1: "1 Main St",
      city: "Indianapolis",
      province: "IN",
      postal_code: zip,
      country_code: "us",
      phone: "+13175550100",
    },
    shipping_address: {
      first_name: "Contract",
      last_name: "Test",
      address_1: "2 Side St",
      city: "Carmel",
      province: "IN",
      postal_code: "46032",
      country_code: "us",
    },
  })
  return provider
}

describeIfKeys("Authorize.net contract (sandbox)", () => {
  const client = () =>
    new AuthorizeNetClient({
      environment: "sandbox",
      apiLoginId: API_LOGIN_ID!,
      transactionKey: TRANSACTION_KEY!,
      logger: silent,
    })

  const token = () => client().securePaymentContainer({ cardNumber: "4111111111111111", expirationDate: "2030-12", cardCode: "900" })

  /** Authorizes a fresh session with a fresh token, the way `cart.complete` does. */
  const authorize = async (provider: any) => {
    const session = sessionId()
    const output = await provider.authorizePayment({
      data: { session_id: session, amount: amount(), currency_code: "usd", opaque_data: await token() },
      context: { idempotency_key: session },
    })
    return { session, output }
  }

  it("connects with the keys, in Live Mode", async () => {
    const descriptor = new AuthorizeNetIntegrationProvider().descriptor
    const result = await descriptor.testConnection({ options: options("automatic") })
    expect(result).toMatchObject({ status: "passed" })
    expect(result.message).toContain("Currencies:")
  })

  it("captures right away, keeping the 33-character session id as the refId", async () => {
    const provider = makeProvider("automatic")
    const { session, output } = await authorize(provider)

    expect(output.status).toBe(PaymentSessionStatus.CAPTURED)
    expect(output.data).toMatchObject({ transactionStatus: "capturedPendingSettlement", card_last4: "1111", opaque_data: null })

    const details = await client().getTransactionDetails(output.data.transId)
    expect(details.transaction?.transactionStatus).toBe("capturedPendingSettlement")
    expect(details.transrefId).toBe(session)
  })

  it("authorizes, then captures the whole amount", async () => {
    const provider = makeProvider("manual")
    const { output } = await authorize(provider)
    expect(output.status).toBe(PaymentSessionStatus.AUTHORIZED)

    const captured = await provider.capturePayment({ data: output.data, context: { idempotency_key: "capt_contract" } })
    expect(captured.data.transactionStatus).toBe("capturedPendingSettlement")
  })

  it("voids an unsettled payment for a full refund and refuses a partial one", async () => {
    const provider = makeProvider("automatic")
    const { output } = await authorize(provider)
    const total = output.data.amount

    await expect(provider.refundPayment({ data: output.data, amount: 0.5 })).rejects.toMatchObject({
      type: MedusaError.Types.NOT_ALLOWED,
    })

    const refunded = await provider.refundPayment({ data: output.data, amount: total, context: { idempotency_key: "ref_contract" } })
    expect(refunded.data).toMatchObject({ transactionStatus: "voided", refunds: [{ voided: true }] })
    const details = await client().getTransactionDetails(output.data.transId)
    expect(details.transaction?.transactionStatus).toBe("voided")
  })

  it("voids an authorization when the payment is canceled", async () => {
    const provider = makeProvider("manual")
    const { output } = await authorize(provider)
    const canceled = await provider.cancelPayment({ data: output.data, context: { idempotency_key: "pay_contract" } })
    expect(canceled.data.transactionStatus).toBe("voided")
  })

  it("hands back the bank's decline for the sandbox's decline ZIP code", async () => {
    const provider = makeProvider("automatic", "46282")
    await expect(authorize(provider)).rejects.toMatchObject({
      type: MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      message: expect.stringContaining("declined"),
    })
  })
})
