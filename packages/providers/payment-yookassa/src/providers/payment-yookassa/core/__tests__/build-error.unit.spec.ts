import axios from "axios"
import YookassaService from "../../services/yookassa"
import { makeLogger } from "./test-utils"

const baseOptions = {
  shopId: "test_shop_id",
  secretKey: "test_secret_key",
} as any

describe("YookassaBase.buildError (protected helper)", () => {
  it("wraps a plain Error with the context message and error.message", () => {
    const yookassa: any = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)
    const original = new Error("something went wrong")
    const wrapped = yookassa.buildError("An error occurred in capturePayment", original)

    expect(wrapped).toBeInstanceOf(Error)
    expect(wrapped.message).toMatch(/An error occurred in capturePayment/)
    expect(wrapped.message).toMatch(/something went wrong/)
  })

  it("formats an AxiosError using status, code and description from the response body", () => {
    const yookassa: any = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

    const axiosError = Object.assign(new Error("Request failed with status code 400"), {
      isAxiosError: true,
      response: {
        status: 400,
        data: { code: "invalid_request", description: "Amount exceeds balance" },
      },
    })
    // Make axios.isAxiosError recognise it
    Object.defineProperty(axiosError, "isAxiosError", { value: true })
    jest.spyOn(axios, "isAxiosError").mockReturnValueOnce(true)

    const wrapped = yookassa.buildError("An error occurred in refundPayment", axiosError)

    expect(wrapped.message).toMatch(/An error occurred in refundPayment/)
    expect(wrapped.message).toMatch(/400/)
    expect(wrapped.message).toMatch(/invalid_request/)
    expect(wrapped.message).toMatch(/Amount exceeds balance/)
  })

  it("trims trailing whitespace when axios response data fields are absent", () => {
    const yookassa: any = new (YookassaService as any)({ logger: makeLogger() }, baseOptions)

    const axiosError = Object.assign(new Error("Network Error"), {
      isAxiosError: true,
      response: {
        status: 500,
        data: {},
      },
    })
    jest.spyOn(axios, "isAxiosError").mockReturnValueOnce(true)

    const wrapped = yookassa.buildError("ctx", axiosError)
    expect(wrapped.message).not.toMatch(/\s+$/)
  })
})
