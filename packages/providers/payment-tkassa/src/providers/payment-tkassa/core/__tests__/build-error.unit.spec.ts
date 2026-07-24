import TkassaService from "../../services/tkassa"
import { makeLogger } from "./test-utils"

const baseOptions = {
  terminalKey: "TestTerminalKey",
  password: "test_password",
} as any

describe("TkassaBase.buildError (protected helper)", () => {
  it("wraps a plain Error with the provided context message + error.message", () => {
    const tkassa: any = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
    const original = new Error("boom")
    const wrapped = tkassa.buildError("An error occurred in capturePayment", original)

    expect(wrapped).toBeInstanceOf(Error)
    expect(wrapped.message).toMatch(/An error occurred in capturePayment/)
    expect(wrapped.message).toMatch(/boom/)
  })

  it("appends `raw.detail` when the upstream error exposes one (HttpErrorWithRaw shape)", () => {
    const tkassa: any = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
    const original = Object.assign(new Error("Init failed"), {
      raw: { detail: "card declined" },
    })
    const wrapped = tkassa.buildError("An error occurred in initiatePayment", original)

    expect(wrapped.message).toMatch(/An error occurred in initiatePayment/)
    expect(wrapped.message).toMatch(/Init failed/)
    expect(wrapped.message).toMatch(/card declined/)
  })

  it("trims trailing whitespace when neither `raw.detail` nor `error.detail` is present", () => {
    const tkassa: any = new (TkassaService as any)({ logger: makeLogger() }, baseOptions)
    const original = new Error("plain")
    const wrapped = tkassa.buildError("ctx", original)
    // Implementation always appends ".${maybeDetail}" then trim()s; with no detail
    // we want the result to NOT end in a stray period or whitespace.
    expect(wrapped.message).not.toMatch(/\s+$/)
  })
})
