import { getPayPalDecline } from "../decline"

describe("getPayPalDecline", () => {
  it("reads a known issue from a 422 error body", () => {
    const decline = getPayPalDecline({
      name: "UNPROCESSABLE_ENTITY",
      details: [{ issue: "INSTRUMENT_DECLINED", description: "declined" }],
    })
    expect(decline).toMatchObject({ code: "INSTRUMENT_DECLINED", retryable: true })
    expect(decline?.message).toContain("declined")
  })

  it("marks a hard decline as not retryable", () => {
    expect(getPayPalDecline({ details: [{ issue: "PAYER_CANNOT_PAY" }] })).toMatchObject({
      code: "PAYER_CANNOT_PAY",
      retryable: false,
    })
  })

  it("treats an unknown *DECLINED issue as a generic decline", () => {
    expect(getPayPalDecline({ details: [{ issue: "CARD_TYPE_DECLINED" }] })).toMatchObject({
      code: "CARD_TYPE_DECLINED",
      retryable: true,
    })
  })

  it("reads the processor response of a declined capture inside an order", () => {
    const decline = getPayPalDecline({
      status: "COMPLETED",
      purchase_units: [
        {
          payments: {
            captures: [
              {
                status: "DECLINED",
                processor_response: { response_code: "5120", avs_code: "Y", cvv_code: "M" },
              },
            ],
          },
        },
      ],
    })
    expect(decline).toMatchObject({ code: "5120", retryable: true, avsCode: "Y", cvvCode: "M" })
    expect(decline?.message).toContain("insufficient funds")
  })

  it("reads a capture returned directly, as an authorization capture is", () => {
    expect(
      getPayPalDecline({ status: "DECLINED", processor_response: { response_code: "9520" } })
    ).toMatchObject({ code: "9520", retryable: false })
  })

  it("ignores the processor response of a completed capture", () => {
    expect(
      getPayPalDecline({
        purchase_units: [
          { payments: { captures: [{ status: "COMPLETED", processor_response: { response_code: "0000" } }] } },
        ],
      })
    ).toBeNull()
  })

  it.each([[null], [undefined], ["text"], [{}], [{ details: [{ issue: "INVALID_PARAMETER_VALUE" }] }]])(
    "returns null for %p",
    (payload) => {
      expect(getPayPalDecline(payload)).toBeNull()
    }
  )
})
