import {
  cardFields,
  fromTransactionDetails,
  fromTransactionResponse,
  readOpaqueData,
  readTransId,
  scrubbed,
} from "../payment-data"

/** What the vendor's `payment-authorizenet-medusa` stored: the SDK's transactionResponse, spread. */
const VENDOR_DATA = {
  responseCode: "1",
  authCode: "ABC123",
  avsResultCode: "Y",
  cvvResultCode: "P",
  transId: "120045678",
  refTransID: "",
  accountNumber: "XXXX1111",
  accountType: "Visa",
  messages: { message: [{ code: "1", description: "This transaction has been approved." }] },
  status: "require_capture",
}

describe("readOpaqueData", () => {
  it.each(["COMMON.ACCEPT.INAPP.PAYMENT", "COMMON.GOOGLE.INAPP.PAYMENT"])("accepts %s", (dataDescriptor) => {
    expect(readOpaqueData({ dataDescriptor, dataValue: "token", extra: "dropped" })).toEqual({
      dataDescriptor,
      dataValue: "token",
    })
  })

  it.each([
    undefined,
    "token",
    { dataDescriptor: "COMMON.APPLE.INAPP.PAYMENT", dataValue: "token" },
    { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: "" },
    { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: 42 },
    { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: "x".repeat(8193) },
  ])("rejects %p", (value) => {
    expect(readOpaqueData(value)).toBeUndefined()
  })
})

describe("readTransId", () => {
  it("reads this provider's data and the vendor plugin's data", () => {
    expect(readTransId({ transId: "60001" })).toBe("60001")
    expect(readTransId(VENDOR_DATA)).toBe("120045678")
  })

  it("ignores Test Mode's id 0 and anything that is not an id", () => {
    expect(readTransId({ transId: "0" })).toBeUndefined()
    expect(readTransId({ transId: 0 })).toBeUndefined()
    expect(readTransId({ transId: "" })).toBeUndefined()
    expect(readTransId({})).toBeUndefined()
    expect(readTransId(undefined)).toBeUndefined()
    expect(readTransId({ transId: 60001 })).toBe("60001")
  })
})

describe("cardFields", () => {
  it.each([
    ["XXXX1111", "Visa", "visa", "1111"],
    ["XXXX0015", "MasterCard", "mastercard", "0015"],
    ["XXXX0002", "AmericanExpress", "amex", "0002"],
    ["XXXX0012", "Discover", "discover", "0012"],
    ["XXXX0017", "JCB", "jcb", "0017"],
    ["XXXX0006", "DinersClub", "diners", "0006"],
    ["XXXX0818", "ChinaUnionPay", "unionpay", "0818"],
  ])("%s %s is %s ending %s", (accountNumber, accountType, brand, last4) => {
    expect(cardFields(accountNumber, accountType)).toEqual({ card_brand: brand, card_last4: last4 })
  })

  it("leaves out what it cannot read", () => {
    expect(cardFields("XXXX", "eCheck")).toEqual({ card_brand: undefined, card_last4: undefined })
    expect(cardFields()).toEqual({ card_brand: undefined, card_last4: undefined })
  })
})

describe("fromTransactionResponse", () => {
  it("keeps the session's fields and adds the transaction's", () => {
    const data = fromTransactionResponse(
      { session_id: "payses_1", amount: 10, currency_code: "usd" },
      { responseCode: "1", transId: "60001", authCode: "ABC", accountNumber: "XXXX1111", accountType: "Visa" },
      { transactionStatus: "capturedPendingSettlement" }
    )
    expect(data).toEqual({
      session_id: "payses_1",
      amount: 10,
      currency_code: "usd",
      transId: "60001",
      authCode: "ABC",
      accountNumber: "XXXX1111",
      accountType: "Visa",
      card_brand: "visa",
      card_last4: "1111",
      transactionStatus: "capturedPendingSettlement",
    })
  })

  it("never overwrites the payment's transId with Test Mode's 0", () => {
    expect(fromTransactionResponse({ transId: "60001" }, { transId: "0" }).transId).toBe("60001")
  })
})

describe("fromTransactionDetails", () => {
  it("refreshes the status and the card from the details", () => {
    const data = fromTransactionDetails(VENDOR_DATA as any, {
      transId: "120045678",
      transactionStatus: "settledSuccessfully",
      payment: { creditCard: { cardNumber: "XXXX1111", expirationDate: "XXXX", cardType: "Visa" } },
    })
    expect(data).toMatchObject({
      transId: "120045678",
      transactionStatus: "settledSuccessfully",
      card_brand: "visa",
      card_last4: "1111",
      authCode: "ABC123",
    })
  })
})

describe("scrubbed", () => {
  it("writes the token as null whether or not the new data carries it", () => {
    const stored = { opaque_data: { dataDescriptor: "COMMON.ACCEPT.INAPP.PAYMENT", dataValue: "token" } }
    expect(scrubbed({ transId: "1" }, stored)).toEqual({ transId: "1", opaque_data: null })
    expect(scrubbed({ transId: "1", opaque_data: stored.opaque_data }, {})).toEqual({ transId: "1", opaque_data: null })
  })

  it("adds nothing when there was never a token", () => {
    expect(scrubbed({ transId: "1" }, { transId: "1" })).toEqual({ transId: "1" })
  })
})
