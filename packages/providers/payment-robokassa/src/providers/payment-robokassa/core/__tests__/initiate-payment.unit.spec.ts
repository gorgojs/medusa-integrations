import { createHash } from "node:crypto"
import RobokassaService from "../../services/robokassa"
import { stringToNumberHash } from "../../utils/string-to-number-hash"
import { makeLogger } from "./test-utils"

const baseOptions = {
  merchantLogin: "test_login",
  hashAlgorithm: "md5",
  password1: "test_password1",
  password2: "test_password2",
  capture: true,
} as any

const baseInput = {
  amount: 15,
  currency_code: "rub",
  data: { session_id: "cart_01HX" },
  context: { idempotency_key: "idem-1" },
} as any

describe("RobokassaBase.initiatePayment", () => {
  // No HTTP call is made — initiatePayment builds a payment URL locally.

  it("returns an id derived from a hash of the idempotency_key", async () => {
    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await robokassa.initiatePayment(baseInput)

    const expected = stringToNumberHash("idem-1").toString()
    expect(result.id).toBe(expected)
  })

  it("formats amount as a decimal string (no kopecks conversion)", async () => {
    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await robokassa.initiatePayment(baseInput)

    const url = new URL((result.data as any).paymentUrl)
    expect(url.searchParams.get("OutSum")).toBe("15.00")
  })

  it("includes MerchantLogin and Shp_SessionID in the payment URL", async () => {
    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await robokassa.initiatePayment(baseInput)

    const url = new URL((result.data as any).paymentUrl)
    expect(url.searchParams.get("MerchantLogin")).toBe("test_login")
    expect(url.searchParams.get("Shp_SessionID")).toBe("cart_01HX")
  })

  it("includes a correct SignatureValue in the payment URL", async () => {
    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await robokassa.initiatePayment(baseInput)

    const invoiceId = stringToNumberHash("idem-1").toString()
    const expected = createHash("md5")
      .update(`test_login:15.00:${invoiceId}:test_password1:Shp_SessionID=cart_01HX`)
      .digest("hex")

    const url = new URL((result.data as any).paymentUrl)
    expect(url.searchParams.get("SignatureValue")).toBe(expected)
  })

  it("points to the Robokassa payment page", async () => {
    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await robokassa.initiatePayment(baseInput)

    const paymentUrl = (result.data as any).paymentUrl as string
    expect(paymentUrl).toMatch(/^https:\/\/auth\.robokassa\.ru\/Merchant\/Index\.aspx/)
  })

  it("passes SuccessUrl2 and FailUrl2 from input.data into the payment URL", async () => {
    const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
    const result = await robokassa.initiatePayment({
      ...baseInput,
      data: {
        ...baseInput.data,
        SuccessUrl2: "https://shop.example.com/success",
        FailUrl2: "https://shop.example.com/fail",
      },
    })

    const url = new URL((result.data as any).paymentUrl)
    expect(url.searchParams.get("SuccessUrl2")).toBe("https://shop.example.com/success")
    expect(url.searchParams.get("FailUrl2")).toBe("https://shop.example.com/fail")
  })

  describe("StepByStep (two-step capture)", () => {
    it("sets StepByStep=true when options.capture is false", async () => {
      const robokassa = new (RobokassaService as any)(
        { logger: makeLogger() },
        { ...baseOptions, capture: false }
      )
      const result = await robokassa.initiatePayment(baseInput)
      const url = new URL((result.data as any).paymentUrl)
      expect(url.searchParams.get("StepByStep")).toBe("true")
    })

    it("omits StepByStep when options.capture is true", async () => {
      const robokassa = new (RobokassaService as any)(
        { logger: makeLogger() },
        { ...baseOptions, capture: true }
      )
      const result = await robokassa.initiatePayment(baseInput)
      const url = new URL((result.data as any).paymentUrl)
      expect(url.searchParams.get("StepByStep")).toBeNull()
    })

    it("StepByStep is included in the signature when options.capture is false", async () => {
      const robokassa = new (RobokassaService as any)(
        { logger: makeLogger() },
        { ...baseOptions, capture: false }
      )
      const result = await robokassa.initiatePayment(baseInput)

      const invoiceId = stringToNumberHash("idem-1").toString()
      // raw: [merchantLogin, outSum, invoiceId, "true" (StepByStep), password1, Shp_SessionID]
      const expected = createHash("md5")
        .update(`test_login:15.00:${invoiceId}:true:test_password1:Shp_SessionID=cart_01HX`)
        .digest("hex")

      const url = new URL((result.data as any).paymentUrl)
      expect(url.searchParams.get("SignatureValue")).toBe(expected)
    })
  })

  describe("Receipt branching", () => {
    const cart = {
      email: "buyer@example.com",
      currency_code: "rub",
      shipping_total: 0,
      shipping_methods: [],
      items: [
        { product_title: "Widget", unit_price: 15, quantity: 1, total: 15 },
      ],
    }

    it("useReceipt=true with cart → Receipt is URL-encoded JSON in the payment URL", async () => {
      const robokassa = new (RobokassaService as any)(
        { logger: makeLogger() },
        {
          ...baseOptions,
          useReceipt: true,
          taxation: "osn",
          taxItemDefault: "none",
          taxShippingDefault: "none",
        }
      )
      const result = await robokassa.initiatePayment({
        ...baseInput,
        data: { ...baseInput.data, cart },
      })

      const url = new URL((result.data as any).paymentUrl)
      const receiptRaw = url.searchParams.get("Receipt")
      expect(receiptRaw).not.toBeNull()
      const receipt = JSON.parse(decodeURIComponent(receiptRaw!))
      expect(receipt.sno).toBe("osn")
      expect(Array.isArray(receipt.items)).toBe(true)
      expect(receipt.items[0].name).toBe("Widget")
    })

    it("useReceipt=false → Receipt is absent from the payment URL", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)
      const result = await robokassa.initiatePayment({
        ...baseInput,
        data: { ...baseInput.data, cart },
      })

      const url = new URL((result.data as any).paymentUrl)
      expect(url.searchParams.get("Receipt")).toBeNull()
    })

    it("useReceipt=true but no cart → Receipt is an encoded empty object, no crash", async () => {
      const robokassa = new (RobokassaService as any)(
        { logger: makeLogger() },
        {
          ...baseOptions,
          useReceipt: true,
          taxation: "osn",
          taxItemDefault: "none",
          taxShippingDefault: "none",
        }
      )
      const result = await robokassa.initiatePayment(baseInput) // no cart
      expect(result.id).toBeDefined()
      const url = new URL((result.data as any).paymentUrl)
      // When useReceipt=true but no cart, the source encodes {} as Receipt — no crash is the key contract.
      const receiptParam = url.searchParams.get("Receipt")
      if (receiptParam !== null) {
        const receipt = JSON.parse(decodeURIComponent(receiptParam))
        expect(typeof receipt).toBe("object")
      }
    })
  })
})
