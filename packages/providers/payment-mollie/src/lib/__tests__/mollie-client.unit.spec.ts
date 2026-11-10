import { MedusaError } from "@medusajs/framework/utils"
import {
  ConnectionError,
  ErrorResponse,
  RequestTimeoutError,
  ResponseValidationError,
  SDKValidationError,
} from "mollie-api-typescript/models/errors"
import {
  callMollie,
  clearMollieClients,
  getMollie,
  MOLLIE_TIMEOUT_MS,
  MOLLIE_USER_AGENT,
  MollieApiError,
  toMollieError,
} from "../mollie-client"

const API_KEY = "test_dHar4XY7LxsDOtmnkVtjNVWXLSlXsM"

function makeLogger() {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
}

function logged(logger: ReturnType<typeof makeLogger>) {
  return ["debug", "info", "warn", "error"]
    .flatMap((level) => (logger[level] as jest.Mock).mock.calls.map((call: unknown[]) => call.map(String).join(" ")))
    .join("\n")
}

function httpMeta(status: number, body: string) {
  return {
    response: new Response(body, { status }),
    request: new Request("https://api.mollie.com/v2/payments"),
    body,
  }
}

function errorResponse(status: number, title: string, detail: string, field?: string) {
  return new ErrorResponse(
    {
      status,
      title,
      detail,
      field,
      links: { documentation: { href: "https://docs.mollie.com/reference/handling-errors", type: "text/html" } },
    },
    httpMeta(status, JSON.stringify({ status, title, detail, field }))
  )
}

describe("getMollie", () => {
  afterEach(() => clearMollieClients())

  it("keeps one client per API key", () => {
    expect(getMollie(API_KEY)).toBe(getMollie(API_KEY))
    expect(getMollie(API_KEY)).not.toBe(getMollie("test_other"))
  })

  it("sets the timeout and the user agent, and never test mode or a profile", () => {
    const options = (getMollie(API_KEY) as any)._options
    expect(options.timeoutMs).toBe(MOLLIE_TIMEOUT_MS)
    // the SDK overwrites `userAgent` and appends only `customUserAgent` to its own
    expect(options.customUserAgent).toBe(MOLLIE_USER_AGENT)
    expect(options.testmode).toBeUndefined()
    expect(options.profileId).toBeUndefined()
  })

  it("names this package and its version in the user agent", () => {
    const { version } = require("../../../package.json")
    expect(MOLLIE_USER_AGENT).toBe(`GorgoMedusaMollie/${version}`)
  })
})

describe("toMollieError", () => {
  it.each([
    [401, MedusaError.Types.UNAUTHORIZED],
    [403, MedusaError.Types.UNAUTHORIZED],
    [404, MedusaError.Types.NOT_FOUND],
    [410, MedusaError.Types.NOT_FOUND],
    [409, MedusaError.Types.CONFLICT],
    [422, MedusaError.Types.INVALID_DATA],
    [429, MedusaError.Types.UNEXPECTED_STATE],
    [503, MedusaError.Types.UNEXPECTED_STATE],
  ])("maps a %s from Mollie to %s", (status, type) => {
    const error = toMollieError("createPayment", errorResponse(status, "Error", "Something went wrong"))
    expect(error).toBeInstanceOf(MollieApiError)
    expect(error).toMatchObject({ type, status, code: `mollie_${status}` })
  })

  it("keeps Mollie's wording and the field it blamed", () => {
    const error = toMollieError(
      "createPayment",
      errorResponse(422, "Unprocessable Entity", "The amount contains an invalid value", "amount.value")
    ) as MollieApiError
    expect(error.message).toBe(
      "Mollie createPayment failed: The amount contains an invalid value (422 field=amount.value)"
    )
    expect(error).toMatchObject({ title: "Unprocessable Entity", field: "amount.value" })
  })

  it("warns when a response does not match the SDK's schema", () => {
    const logger = makeLogger()
    const error = toMollieError(
      "getPayment",
      new ResponseValidationError("Response validation failed", {
        ...httpMeta(200, "{}"),
        cause: new Error("bad"),
        rawValue: {},
        rawMessage: "bad",
      }),
      logger
    )
    expect(error).toMatchObject({ type: MedusaError.Types.UNEXPECTED_STATE, status: 200 })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("may be older than the API"))
  })

  it("turns a request the SDK rejected into invalid data", () => {
    const error = toMollieError("createPayment", new SDKValidationError("Input validation failed", new Error("x"), {}))
    expect(error).toMatchObject({ type: MedusaError.Types.INVALID_DATA, code: "mollie_unreachable" })
  })

  it.each([
    new RequestTimeoutError("Request timed out"),
    new ConnectionError("Unable to make request"),
  ])("turns %s into an unexpected state", (failure) => {
    expect(toMollieError("getPayment", failure)).toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
      message: expect.stringContaining(failure.message),
    })
  })

  it("passes any other error through", () => {
    const plain = new Error("plain")
    expect(toMollieError("getPayment", plain)).toBe(plain)
    const mollie = new MollieApiError(MedusaError.Types.NOT_FOUND, "x", { status: 404 })
    expect(toMollieError("getPayment", mollie)).toBe(mollie)
  })
})

describe("callMollie", () => {
  it("logs the ids and the response's id, status and mode, never the key", async () => {
    const logger = makeLogger()
    const response = { id: "tr_7UhSN1zuXS", resource: "payment", status: "open", mode: "test", description: "Cart cart_1" }
    await expect(
      callMollie(logger, "createPayment", { session_id: "payses_1", api_key: undefined }, async () => response)
    ).resolves.toBe(response)

    expect(logger.debug).toHaveBeenNthCalledWith(1, 'MollieClient.createPayment request: {"session_id":"payses_1"}')
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      'MollieClient.createPayment response: {"id":"tr_7UhSN1zuXS","resource":"payment","status":"open","mode":"test"}'
    )
    expect(logged(logger)).not.toContain(API_KEY)
    expect(logged(logger)).not.toContain("Cart cart_1")
  })

  it("throws a MollieApiError and logs its status", async () => {
    const logger = makeLogger()
    await expect(
      callMollie(logger, "getPayment", { payment_id: "tr_1" }, async () => {
        throw errorResponse(404, "Not Found", "No payment exists with token tr_1.")
      })
    ).rejects.toMatchObject({ type: MedusaError.Types.NOT_FOUND, status: 404 })
    expect(logger.debug).toHaveBeenLastCalledWith(
      'MollieClient.getPayment error: {"status":404,"title":"Not Found"}'
    )
  })
})
