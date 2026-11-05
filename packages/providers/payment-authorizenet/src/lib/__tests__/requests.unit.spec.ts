import { readFileSync } from "node:fs"
import { join } from "node:path"
import { buildTransactionRequest, toAnetBillTo, toAnetCustomer, toAnetShipTo } from "../requests"

/** Element order distilled from the XSD by `yarn spec:pull`. */
const ORDER: Record<string, string[]> = JSON.parse(
  readFileSync(join(__dirname, "../../../spec/element-order.json"), "utf8")
)

/** Which XSD type each key of a request holds. */
const CHILD_TYPES: Record<string, Record<string, string>> = {
  createTransactionRequest: { transactionRequest: "transactionRequestType" },
  transactionRequestType: {
    payment: "paymentType",
    customer: "customerDataType",
    billTo: "customerAddressType",
    shipTo: "nameAndAddressType",
  },
  paymentType: { opaqueData: "opaqueDataType", creditCard: "creditCardType" },
}

/** Fails unless the object's keys follow the type's element order, recursively. */
function expectXsdOrder(value: Record<string, unknown>, type: string) {
  const order = ORDER[type]
  expect(order).toBeDefined()
  const keys = Object.keys(value)
  const positions = keys.map((key) => order.indexOf(key))
  expect({ type, unknown: keys.filter((_, i) => positions[i] < 0) }).toEqual({ type, unknown: [] })
  expect({ type, keys }).toEqual({ type, keys: [...keys].sort((a, b) => order.indexOf(a) - order.indexOf(b)) })

  for (const [key, child] of Object.entries(value)) {
    const childType = CHILD_TYPES[type]?.[key]
    if (childType && child && typeof child === "object") {
      expectXsdOrder(child as Record<string, unknown>, childType)
    }
  }
  if (type === "transactionRequestType") {
    const settings = (value.transactionSettings as { setting?: Record<string, unknown>[] } | undefined)?.setting ?? []
    settings.forEach((setting) => expectXsdOrder(setting, "settingType"))
    const fields = (value.userFields as { userField?: Record<string, unknown>[] } | undefined)?.userField ?? []
    fields.forEach((field) => expectXsdOrder(field, "userField"))
  }
}

const address = {
  first_name: "Jane",
  last_name: "Doe",
  company: "Acme",
  address_1: "1 Main St",
  address_2: "Apt 2",
  city: "Indianapolis",
  province: "IN",
  postal_code: "46201",
  country_code: "us",
  phone: "+13175550100",
}

describe("request element order", () => {
  it("builds a full authorization in the XSD's order", () => {
    const request = buildTransactionRequest({
      transactionType: "authCaptureTransaction",
      amount: "10.00",
      currencyCode: "usd",
      payment: { opaqueData: { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: "token" } },
      customer: toAnetCustomer("buyer@example.com"),
      billTo: toAnetBillTo(address),
      shipTo: toAnetShipTo(address),
      settings: [{ settingName: "duplicateWindow", settingValue: "120" }],
      userFields: [{ name: "medusa_session_id", value: "payses_1" }],
    })
    expectXsdOrder(request as unknown as Record<string, unknown>, "transactionRequestType")
    expectXsdOrder(
      {
        merchantAuthentication: {},
        refId: "payses_1",
        transactionRequest: request,
      },
      "createTransactionRequest"
    )
  })

  it("builds a refund with the card's last four digits in the XSD's order", () => {
    const request = buildTransactionRequest({
      transactionType: "refundTransaction",
      amount: "5.00",
      currencyCode: "USD",
      payment: { creditCard: { cardNumber: "1111", expirationDate: "XXXX" } },
      refTransId: "60001",
    })
    expectXsdOrder(request as unknown as Record<string, unknown>, "transactionRequestType")
  })

  it("keeps the merchant authentication and refId first, as ANetApiRequest declares", () => {
    expect(ORDER.ANetApiRequest).toEqual(["merchantAuthentication", "clientId", "refId"])
    expect(ORDER.getTransactionDetailsRequest.slice(0, 4)).toEqual([
      "merchantAuthentication",
      "clientId",
      "refId",
      "transId",
    ])
  })

  it("leaves out what was not given", () => {
    expect(buildTransactionRequest({ transactionType: "voidTransaction", refTransId: "60001" })).toEqual({
      transactionType: "voidTransaction",
      refTransId: "60001",
    })
  })
})

describe("addresses (regression В9)", () => {
  it("joins the street lines without an `undefined` when there is no second line", () => {
    expect(toAnetShipTo({ ...address, address_2: null })?.address).toBe("1 Main St")
    expect(toAnetShipTo(address)?.address).toBe("1 Main St, Apt 2")
  })

  it("upper-cases the country and puts the phone only on billTo", () => {
    expect(toAnetShipTo(address)).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      company: "Acme",
      address: "1 Main St, Apt 2",
      city: "Indianapolis",
      state: "IN",
      zip: "46201",
      country: "US",
    })
    expect(toAnetBillTo(address)?.phoneNumber).toBe("+13175550100")
    expect(toAnetShipTo(address)).not.toHaveProperty("phoneNumber")
  })

  it("cuts fields to the gateway's lengths", () => {
    const long = toAnetBillTo({
      first_name: "a".repeat(80),
      address_1: "b".repeat(80),
      city: "c".repeat(80),
      postal_code: "1".repeat(30),
      phone: "2".repeat(40),
    })
    expect(long?.firstName).toHaveLength(50)
    expect(long?.address).toHaveLength(60)
    expect(long?.city).toHaveLength(40)
    expect(long?.zip).toHaveLength(20)
    expect(long?.phoneNumber).toHaveLength(25)
  })

  it("returns nothing for a missing or empty address", () => {
    expect(toAnetShipTo(null)).toBeUndefined()
    expect(toAnetBillTo({ first_name: " ", phone: "" })).toBeUndefined()
    expect(toAnetCustomer("  ")).toBeUndefined()
  })

  it("cuts user field values to 255 characters", () => {
    const request = buildTransactionRequest({
      transactionType: "authOnlyTransaction",
      userFields: [{ name: "note", value: "x".repeat(300) }],
    })
    expect(request.userFields?.userField[0].value).toHaveLength(255)
  })
})
