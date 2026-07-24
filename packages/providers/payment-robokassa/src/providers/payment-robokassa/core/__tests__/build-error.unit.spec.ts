import RobokassaService from "../../services/robokassa"
import { makeLogger } from "./test-utils"

const baseOptions = {
  merchantLogin: "test_login",
  hashAlgorithm: "md5",
  password1: "test_password1",
  password2: "test_password2",
} as any

describe("RobokassaBase.buildError (protected helper)", () => {
  it("wraps a plain Error with the provided context message + error.message", () => {
    const robokassa: any = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const original = new Error("network failure")
    const wrapped = robokassa.buildError("An error occurred in capturePayment", original)

    expect(wrapped).toBeInstanceOf(Error)
    expect(wrapped.message).toMatch(/An error occurred in capturePayment/)
    expect(wrapped.message).toMatch(/network failure/)
  })

  it("formats an AxiosError using response status, code and description", () => {
    const robokassa: any = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const axiosLike = Object.assign(new Error("Request failed"), {
      isAxiosError: true,
      response: {
        status: 400,
        data: { code: "INVALID_SIGNATURE", description: "Signature mismatch" },
      },
    })
    const wrapped = robokassa.buildError("An error occurred in capturePayment", axiosLike)

    expect(wrapped.message).toMatch(/An error occurred in capturePayment/)
    expect(wrapped.message).toMatch(/400/)
    expect(wrapped.message).toMatch(/INVALID_SIGNATURE/)
    expect(wrapped.message).toMatch(/Signature mismatch/)
  })

  it("trims trailing whitespace when response fields are absent", () => {
    const robokassa: any = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const original = new Error("plain")
    const wrapped = robokassa.buildError("ctx", original)
    expect(wrapped.message).not.toMatch(/\s+$/)
  })
})
