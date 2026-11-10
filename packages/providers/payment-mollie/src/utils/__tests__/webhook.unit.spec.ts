import { isSessionId, readMetadataSessionId, readRawBody, readWebhookPaymentId } from "../webhook"

describe("readRawBody", () => {
  it("reads a string, a Buffer and a Buffer serialized by the event bus", () => {
    const body = "id=tr_7UhSN1zuXS"
    expect(readRawBody(body)).toBe(body)
    expect(readRawBody(Buffer.from(body))).toBe(body)
    expect(readRawBody(JSON.parse(JSON.stringify(Buffer.from(body))))).toBe(body)
  })

  it("returns null for nothing", () => {
    expect(readRawBody("")).toBeNull()
    expect(readRawBody(Buffer.alloc(0))).toBeNull()
    expect(readRawBody(undefined)).toBeNull()
    expect(readRawBody({ id: "tr_1" })).toBeNull()
  })
})

describe("readWebhookPaymentId", () => {
  it("reads the id Medusa's body parser took from the form", () => {
    expect(readWebhookPaymentId({ data: { id: "tr_7UhSN1zuXS" } })).toBe("tr_7UhSN1zuXS")
  })

  it("falls back to the raw form body", () => {
    expect(readWebhookPaymentId({ data: {}, rawData: Buffer.from("id=tr_7UhSN1zuXS") })).toBe("tr_7UhSN1zuXS")
    expect(
      readWebhookPaymentId({ rawData: JSON.parse(JSON.stringify(Buffer.from("id=tr_7UhSN1zuXS"))) })
    ).toBe("tr_7UhSN1zuXS")
  })

  it.each([
    { data: { id: "re_4qqhO89gsT" } },
    { data: { id: "tr_../../refunds" } },
    { data: { id: 42 }, rawData: "id=nothing" },
    { data: {}, rawData: '{"id":"event_GvJ8WHrp5BE5","entityId":"tr_7UhSN1zuXS"}' },
    { data: {} },
    undefined,
  ])("refuses what is not a payment id: %j", (payload) => {
    expect(readWebhookPaymentId(payload as any)).toBeNull()
  })
})

describe("readMetadataSessionId", () => {
  it("reads a Medusa session id from the payment's metadata", () => {
    expect(readMetadataSessionId({ session_id: "payses_01JB", cart_id: "cart_1" })).toBe("payses_01JB")
    expect(isSessionId("payses_01JB")).toBe(true)
  })

  it.each([null, "payses_01JB", 42, {}, { session_id: "cart_1" }, { session_id: 7 }])(
    "returns null for %j",
    (metadata) => {
      expect(readMetadataSessionId(metadata)).toBeNull()
    }
  )
})
