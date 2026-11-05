import { createHmac } from "node:crypto"
import { PaymentActions } from "@medusajs/framework/utils"
import {
  isSessionId,
  parseWebhookEvent,
  readRawBody,
  readSignature,
  REQUIRED_WEBHOOK_EVENTS,
  verifyAnetSignature,
  WEBHOOK_ACTIONS,
} from "../webhook"

const KEY = "8B2A6B2C5D1E4F7A9C3B0D2E6F1A4B7C9D2E5F8A1B4C7D0E3F6A9B2C5D8E1F4A7B0C3D6E9F2A5B8C1D4E7F0A3B6C9D2E5F8A1B4C7D0E3F6A9B2C5D8E1F4A"
const BODY = Buffer.from(JSON.stringify({ eventType: "net.authorize.payment.fraud.approved", payload: { id: "60001" } }))

const hmac = (key: Buffer | string, body = BODY) => createHmac("sha512", key).update(body).digest("hex")

describe("verifyAnetSignature", () => {
  it.each([
    ["sha512= and upper-case hex", `sha512=${hmac(KEY).toUpperCase()}`],
    ["sha512= and lower-case hex", `sha512=${hmac(KEY)}`],
    ["no prefix", hmac(KEY).toUpperCase()],
    ["an upper-case prefix", `SHA512=${hmac(KEY).toUpperCase()}`],
  ])("accepts the key used as text with %s", (_, header) => {
    expect(verifyAnetSignature(BODY, header, KEY)).toBe(true)
  })

  it("accepts the key used as the bytes its hex spells", () => {
    expect(verifyAnetSignature(BODY, `sha512=${hmac(Buffer.from(KEY, "hex")).toUpperCase()}`, KEY)).toBe(true)
  })

  it("rejects another key, a changed body and a malformed header", () => {
    expect(verifyAnetSignature(BODY, `sha512=${hmac("other-key")}`, KEY)).toBe(false)
    expect(verifyAnetSignature(Buffer.from(`${BODY.toString()} `), `sha512=${hmac(KEY)}`, KEY)).toBe(false)
    expect(verifyAnetSignature(BODY, "sha512=abc", KEY)).toBe(false)
    expect(verifyAnetSignature(BODY, `sha512=${"z".repeat(128)}`, KEY)).toBe(false)
    expect(verifyAnetSignature(BODY, "", KEY)).toBe(false)
  })
})

describe("readRawBody", () => {
  it("reads a Buffer, a string and a serialized Buffer", () => {
    expect(readRawBody(BODY)).toEqual(BODY)
    expect(readRawBody(BODY.toString())).toEqual(BODY)
    expect(readRawBody(JSON.parse(JSON.stringify(BODY)))).toEqual(BODY)
  })

  it.each([undefined, null, "", Buffer.alloc(0), { type: "Other" }])("returns null for %p", (value) => {
    expect(readRawBody(value)).toBeNull()
  })
})

describe("readSignature", () => {
  it("finds the header in any case and as an array", () => {
    expect(readSignature({ "X-ANET-Signature": "sha512=AB" })).toBe("sha512=AB")
    expect(readSignature({ "x-anet-signature": ["sha512=CD"] })).toBe("sha512=CD")
    expect(readSignature({ other: "x" })).toBeNull()
    expect(readSignature(undefined)).toBeNull()
  })
})

describe("parseWebhookEvent", () => {
  it("reads an event, with or without a byte order mark", () => {
    expect(parseWebhookEvent(BODY)?.eventType).toBe("net.authorize.payment.fraud.approved")
    expect(parseWebhookEvent(Buffer.from(`\uFEFF${BODY.toString()}`))?.payload?.id).toBe("60001")
  })

  it("returns null for what is not an event", () => {
    expect(parseWebhookEvent(Buffer.from("not json"))).toBeNull()
    expect(parseWebhookEvent(Buffer.from("{}"))).toBeNull()
  })
})

describe("the event map", () => {
  it("acts on held transactions and on captures made in the Merchant Interface", () => {
    expect(WEBHOOK_ACTIONS).toEqual({
      "net.authorize.payment.fraud.approved": PaymentActions.AUTHORIZED,
      "net.authorize.payment.priorAuthCapture.created": PaymentActions.SUCCESSFUL,
      "net.authorize.payment.fraud.declined": PaymentActions.FAILED,
    })
    expect(REQUIRED_WEBHOOK_EVENTS).toEqual(Object.keys(WEBHOOK_ACTIONS))
  })

  it("recognises a Medusa session id", () => {
    expect(isSessionId("payses_01JB")).toBe(true)
    expect(isSessionId("capt_01JB")).toBe(false)
    expect(isSessionId(undefined)).toBe(false)
  })
})
