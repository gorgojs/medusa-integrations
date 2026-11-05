import { MedusaError } from "@medusajs/framework/utils"
import {
  AUTHORIZENET_ENDPOINTS,
  AuthorizeNetApiError,
  AuthorizeNetClient,
  toAuthorizeNetError,
} from "../authorizenet-client"
import { buildTransactionRequest } from "../requests"

const API_LOGIN_ID = "login-123"
const TRANSACTION_KEY = "SECRET-transaction-key"
const TOKEN = "eyJ0b2tlbiI6IjEyMzQ1Njc4OTAifQ=="

function makeLogger() {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
}

function jsonResponse(body: unknown, { status = 200, bom = true } = {}) {
  return new Response(`${bom ? "\uFEFF" : ""}${JSON.stringify(body)}`, {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

const OK = { resultCode: "Ok", message: [{ code: "I00001", text: "Successful." }] }

function makeClient(fetchImpl: jest.Mock, overrides: Partial<ConstructorParameters<typeof AuthorizeNetClient>[0]> = {}) {
  const logger = makeLogger()
  const client = new AuthorizeNetClient({
    environment: "sandbox",
    apiLoginId: API_LOGIN_ID,
    transactionKey: TRANSACTION_KEY,
    logger,
    fetch: fetchImpl as unknown as typeof fetch,
    retryBaseDelayMs: 0,
    ...overrides,
  })
  return { client, logger }
}

function sentBody(fetchImpl: jest.Mock, call = 0) {
  return JSON.parse(fetchImpl.mock.calls[call][1].body)
}

function allLogs(logger: any): string {
  return [...logger.debug.mock.calls, ...logger.warn.mock.calls, ...logger.info.mock.calls]
    .map((args: unknown[]) => args.join(" "))
    .join("\n")
}

const authCapture = () =>
  buildTransactionRequest({
    transactionType: "authCaptureTransaction",
    amount: "10.00",
    currencyCode: "usd",
    payment: { opaqueData: { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: TOKEN } },
    customer: { email: "buyer@example.com" },
    billTo: { firstName: "Jane", address: "1 Main St", zip: "46201" },
  })

describe("AuthorizeNetClient.createTransaction", () => {
  it("posts the envelope to the sandbox endpoint and returns an approved transaction", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        refId: "payses_1",
        messages: OK,
        transactionResponse: { responseCode: "1", transId: "60001", accountNumber: "XXXX1111", accountType: "Visa" },
      })
    )
    const { client } = makeClient(fetchImpl)

    const result = await client.createTransaction(authCapture(), "payses_1")

    expect(fetchImpl.mock.calls[0][0]).toBe(AUTHORIZENET_ENDPOINTS.sandbox.api)
    const body = sentBody(fetchImpl)
    expect(Object.keys(body.createTransactionRequest)).toEqual(["merchantAuthentication", "refId", "transactionRequest"])
    expect(body.createTransactionRequest.merchantAuthentication).toEqual({
      name: API_LOGIN_ID,
      transactionKey: TRANSACTION_KEY,
    })
    expect(body.createTransactionRequest.transactionRequest.currencyCode).toBe("USD")
    expect(result).toEqual({
      refId: "payses_1",
      responseCode: "1",
      transactionResponse: expect.objectContaining({ transId: "60001" }),
    })
  })

  it("uses the production endpoint in production", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({ messages: OK, transactionResponse: { responseCode: "1", transId: "1" } }))
    const { client } = makeClient(fetchImpl, { environment: "production" })
    await client.createTransaction(authCapture())
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.authorize.net/xml/v1/request.api")
  })

  it("returns a transaction held for review (4)", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        messages: OK,
        transactionResponse: { responseCode: "4", transId: "60002", messages: [{ code: "253", description: "held" }] },
      })
    )
    const { client } = makeClient(fetchImpl)
    await expect(client.createTransaction(authCapture())).resolves.toMatchObject({ responseCode: "4" })
  })

  it("throws a payment authorization error with the gateway's text for a decline", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        messages: { resultCode: "Error", message: [{ code: "E00027", text: "The transaction was unsuccessful." }] },
        transactionResponse: {
          responseCode: "2",
          transId: "60003",
          errors: [{ errorCode: "2", errorText: "This transaction has been declined." }],
        },
      })
    )
    const { client } = makeClient(fetchImpl)

    const error = await client.createTransaction(authCapture()).catch((e) => e)

    expect(error).toBeInstanceOf(AuthorizeNetApiError)
    expect(error.type).toBe(MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR)
    expect(error.message).toBe(
      "Authorize.net createTransaction failed: This transaction has been declined. code=2 responseCode=2"
    )
    expect(error.responseCode).toBe("2")
    expect(error.anetCode).toBe("2")
  })

  it("never repeats a transaction, even after a network error, and says the outcome is unknown", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError("fetch failed"))
    const { client } = makeClient(fetchImpl)

    const error = await client.createTransaction(authCapture()).catch((e) => e)

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(error).toBeInstanceOf(AuthorizeNetApiError)
    expect(error.type).toBe(MedusaError.Types.UNEXPECTED_STATE)
    expect(error.message).toContain("The outcome is unknown")
  })

  it("turns a timeout into an error instead of hanging (regression В6)", async () => {
    const fetchImpl = jest.fn((_url: string, init: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        init.signal!.addEventListener("abort", () => reject(init.signal!.reason))
      })
    })
    const { client } = makeClient(fetchImpl as any, { timeoutMs: 20 })

    const error = await client.createTransaction(authCapture()).catch((e) => e)

    expect(error).toBeInstanceOf(AuthorizeNetApiError)
    expect(error.message).toContain("timed out after 20 ms")
  })

  it("never logs the transaction key, the token, the email or the address", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse({ messages: OK, transactionResponse: { responseCode: "1", transId: "1" } }))
    const { client, logger } = makeClient(fetchImpl)

    await client.createTransaction(authCapture(), "payses_1")

    const logs = allLogs(logger)
    expect(logs).toContain("AuthorizeNetClient.createTransaction request:")
    expect(logs).toContain("AuthorizeNetClient.createTransaction response:")
    for (const secret of [TRANSACTION_KEY, TOKEN, "buyer@example.com", "1 Main St", API_LOGIN_ID]) {
      expect(logs).not.toContain(secret)
    }
  })
})

describe("AuthorizeNetClient reads", () => {
  it("strips the byte order mark and returns the details", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        messages: OK,
        transrefId: "payses_1",
        transaction: { transId: "60001", transactionStatus: "settledSuccessfully" },
      })
    )
    const { client } = makeClient(fetchImpl)

    const details = await client.getTransactionDetails("60001")

    expect(details.transaction?.transactionStatus).toBe("settledSuccessfully")
    expect(details.transrefId).toBe("payses_1")
    expect(sentBody(fetchImpl).getTransactionDetailsRequest.transId).toBe("60001")
  })

  it("throws instead of hanging when the details answer with an error (regression В6)", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        messages: { resultCode: "Error", message: [{ code: "E00040", text: "The record cannot be found." }] },
      })
    )
    const { client } = makeClient(fetchImpl)
    await expect(client.getTransactionDetails("1")).rejects.toThrow(
      "Authorize.net getTransactionDetails failed: The record cannot be found. code=E00040"
    )
  })

  it("repeats a read after a network error and a 5xx, then succeeds", async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("oops", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ messages: OK, gatewayId: "123456", currencies: ["USD"] }))
    const { client, logger } = makeClient(fetchImpl)

    const merchant = await client.getMerchantDetails()

    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(merchant.gatewayId).toBe("123456")
    expect(logger.warn).toHaveBeenCalledTimes(2)
  })

  it("gives up on a read after the last attempt", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response("oops", { status: 502 }))
    const { client } = makeClient(fetchImpl)
    await expect(client.authenticateTest()).rejects.toThrow("Authorize.net authenticateTest failed: HTTP 502")
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it("does not repeat a read on a 4xx", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response("bad", { status: 400 }))
    const { client } = makeClient(fetchImpl)
    await expect(client.getMerchantDetails()).rejects.toThrow("HTTP 400")
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it("maps wrong credentials to unauthorized", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        messages: { resultCode: "Error", message: [{ code: "E00007", text: "User authentication failed." }] },
      })
    )
    const { client } = makeClient(fetchImpl)
    const error = await client.authenticateTest().catch((e) => e)
    expect(error.type).toBe(MedusaError.Types.UNAUTHORIZED)
    expect(error.anetCode).toBe("E00007")
  })

  it("lists webhooks over REST with basic auth", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse(
        [
          {
            webhookId: "wh-1",
            status: "active",
            url: "https://shop.example/hooks/payment/authorizenet_authorizenet",
            eventTypes: ["net.authorize.payment.fraud.approved"],
          },
        ],
        { bom: false }
      )
    )
    const { client } = makeClient(fetchImpl)

    const webhooks = await client.listWebhooks()

    expect(fetchImpl.mock.calls[0][0]).toBe("https://apitest.authorize.net/rest/v1/webhooks")
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe(
      `Basic ${Buffer.from(`${API_LOGIN_ID}:${TRANSACTION_KEY}`).toString("base64")}`
    )
    expect(webhooks).toHaveLength(1)
  })

  it("turns card data into a token for the contract tests", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        messages: OK,
        opaqueData: { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: TOKEN },
      })
    )
    const { client } = makeClient(fetchImpl)

    const token = await client.securePaymentContainer({ cardNumber: "4111111111111111", expirationDate: "122030" })

    expect(token).toEqual({ dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: TOKEN })
    const data = sentBody(fetchImpl).securePaymentContainerRequest.data
    expect(Object.keys(data)).toEqual(["type", "id", "token"])
    expect(data.type).toBe("TOKEN")
  })
})

describe("toAuthorizeNetError", () => {
  it("reads a single error object as well as an array", () => {
    const error = toAuthorizeNetError("createTransaction", {
      messages: { resultCode: "Error", message: { code: "E00027", text: "The transaction was unsuccessful." } as any },
      transactionResponse: {
        responseCode: "3",
        errors: { errorCode: "54", errorText: "The referenced transaction does not meet the criteria for issuing a credit." } as any,
      },
    })
    expect(error.anetCode).toBe("54")
    expect(error.type).toBe(MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR)
  })

  it.each([
    ["E00003", MedusaError.Types.INVALID_DATA],
    ["E00013", MedusaError.Types.INVALID_DATA],
    ["E00008", MedusaError.Types.UNAUTHORIZED],
    ["E00001", MedusaError.Types.UNEXPECTED_STATE],
  ])("maps %s to %s", (code, type) => {
    const error = toAuthorizeNetError("getMerchantDetails", {
      messages: { resultCode: "Error", message: [{ code, text: "x" }] },
    })
    expect(error.type).toBe(type)
  })
})
