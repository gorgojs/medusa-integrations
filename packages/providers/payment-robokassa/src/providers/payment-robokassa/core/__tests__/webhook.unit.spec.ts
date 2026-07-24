import { createHash } from "node:crypto"
import { PaymentActions } from "@medusajs/framework/utils"
import RobokassaService from "../../services/robokassa"
import { makeLogger } from "./test-utils"

const MERCHANT_LOGIN = "test_login"
const PASSWORD1 = "test_password1"
const PASSWORD2 = "test_password2"
const HASH_ALGORITHM = "md5"

const baseOptions = {
  merchantLogin: MERCHANT_LOGIN,
  hashAlgorithm: HASH_ALGORITHM,
  password1: PASSWORD1,
  password2: PASSWORD2,
} as any

/**
 * Replicates isWebhookEventValid signature logic:
 * raw = [OutSum, InvId, password2, `Shp_SessionID=${Shp_SessionID}`]
 * filter falsy, join with ":", hash with hashAlgorithm
 */
function signWebhookPayload(
  data: { OutSum: string; InvId: string; Shp_SessionID: string },
  password2: string,
  algorithm: string
): string {
  const raw = [data.OutSum, data.InvId, password2, `Shp_SessionID=${data.Shp_SessionID}`]
  const concatenated = raw.filter(Boolean).join(":")
  return createHash(algorithm).update(concatenated).digest("hex")
}

function makeSignedEvent(overrides: Partial<{
  OutSum: string
  InvId: string
  Shp_SessionID: string
  SignatureValue: string
}> = {}) {
  const base = {
    OutSum: "15.00",
    InvId: "12345",
    Shp_SessionID: "cart_01HX",
  }
  const merged = { ...base, ...overrides }
  const signature = signWebhookPayload(merged, PASSWORD2, HASH_ALGORITHM)
  return {
    ...merged,
    SignatureValue: overrides.SignatureValue ?? signature,
    // Robokassa also sends these lowercase aliases
    out_summ: merged.OutSum,
    inv_id: merged.InvId,
    PaymentMethod: "BankCard",
    IncSum: merged.OutSum,
    IncCurrLabel: "BANKOCEAN2",
    EMAil: "buyer@example.com",
    Fee: "0",
  }
}

function wrap(data: Record<string, any>) {
  return { data, rawData: Buffer.from(""), headers: {} }
}

describe("RobokassaBase.getWebhookActionAndData", () => {
  describe("with a correctly signed payload", () => {
    it("returns SUCCESSFUL action and passes OutSum as-is (no unit conversion)", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)

      const result = await robokassa.getWebhookActionAndData(wrap(makeSignedEvent()))

      expect(result.action).toBe(PaymentActions.SUCCESSFUL)
      expect(result.data).toEqual({ session_id: "cart_01HX", amount: 15 }) // Number("15.00")
    })

    it("passes the Shp_SessionID as session_id", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)

      const event = makeSignedEvent({ OutSum: "99.50", InvId: "99", Shp_SessionID: "sess_abc" })
      const result = await robokassa.getWebhookActionAndData(wrap(event))

      expect(result.data?.session_id).toBe("sess_abc")
      expect(result.data?.amount).toBe(99.5) // Number("99.50")
    })
  })

  describe("rejection cases", () => {
    it("returns NOT_SUPPORTED for a payload signed with the wrong password", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)

      const event = makeSignedEvent({
        SignatureValue: signWebhookPayload(
          { OutSum: "15.00", InvId: "12345", Shp_SessionID: "cart_01HX" },
          "wrong_password",
          HASH_ALGORITHM
        ),
      })

      const result = await robokassa.getWebhookActionAndData(wrap(event))
      expect(result).toEqual({ action: PaymentActions.NOT_SUPPORTED })
    })

    it("returns NOT_SUPPORTED when OutSum is tampered with after signing", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)

      const event = makeSignedEvent()
      event.OutSum = "9999.00" // tampered after signature computed

      const result = await robokassa.getWebhookActionAndData(wrap(event))
      expect(result).toEqual({ action: PaymentActions.NOT_SUPPORTED })
    })

    it("returns NOT_SUPPORTED when InvId is tampered with after signing", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)

      const event = makeSignedEvent()
      event.InvId = "99999" // tampered

      const result = await robokassa.getWebhookActionAndData(wrap(event))
      expect(result).toEqual({ action: PaymentActions.NOT_SUPPORTED })
    })

    it("returns NOT_SUPPORTED when Shp_SessionID is tampered with after signing", async () => {
      const robokassa = new (RobokassaService as any)({ logger: makeLogger() }, baseOptions)

      const event = makeSignedEvent()
      event.Shp_SessionID = "other_session" // tampered

      const result = await robokassa.getWebhookActionAndData(wrap(event))
      expect(result).toEqual({ action: PaymentActions.NOT_SUPPORTED })
    })
  })
})
