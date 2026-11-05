import { createHmac } from "node:crypto"
import { PaymentActions } from "@medusajs/framework/utils"
import { DEFAULT_OPTIONS, makeProvider, SESSION_ID, TRANS_ID } from "./test-utils"

const KEY = DEFAULT_OPTIONS.signatureKey as string

/** A webhook request as Medusa's route hands it to the provider, signed like Authorize.net signs it. */
function signedWebhook(
  eventType: string,
  payload: Record<string, unknown> = {},
  { key = KEY, rawAs = "buffer" }: { key?: string; rawAs?: "buffer" | "string" | "serialized" } = {}
) {
  const body = JSON.stringify({
    notificationId: "d0e8e7fe-c3e7-4add-a480-27bc5ce28a77",
    eventType,
    eventDate: "2026-10-28T12:00:00.000Z",
    webhookId: "wh-1",
    payload: {
      responseCode: 1,
      merchantReferenceId: SESSION_ID,
      authCode: "ABC123",
      avsResponse: "Y",
      authAmount: 19.99,
      entityName: "transaction",
      id: TRANS_ID,
      ...payload,
    },
  })
  const signature = `sha512=${createHmac("sha512", key).update(body).digest("hex").toUpperCase()}`
  const buffer = Buffer.from(body)
  const rawData = rawAs === "string" ? body : rawAs === "serialized" ? JSON.parse(JSON.stringify(buffer)) : buffer
  return { data: JSON.parse(body), rawData, headers: { "x-anet-signature": signature } }
}

describe("getWebhookActionAndData", () => {
  it("authorizes the session of a held transaction once it is approved", async () => {
    const { provider } = makeProvider()
    expect(await provider.getWebhookActionAndData(signedWebhook("net.authorize.payment.fraud.approved"))).toEqual({
      action: PaymentActions.AUTHORIZED,
      data: { session_id: SESSION_ID, amount: 19.99 },
    })
  })

  it("records a capture made in the Merchant Interface, finding the session through the transaction", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue({ messages: { resultCode: "Ok" }, transrefId: SESSION_ID })

    const output = await provider.getWebhookActionAndData(
      signedWebhook("net.authorize.payment.priorAuthCapture.created", { merchantReferenceId: undefined })
    )

    expect(client.getTransactionDetails).toHaveBeenCalledWith(TRANS_ID)
    expect(output).toEqual({ action: PaymentActions.SUCCESSFUL, data: { session_id: SESSION_ID, amount: 19.99 } })
  })

  it("looks the session up when the reference names a Medusa capture, not a session", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue({ messages: { resultCode: "Ok" }, transrefId: SESSION_ID })
    const output = await provider.getWebhookActionAndData(
      signedWebhook("net.authorize.payment.priorAuthCapture.created", { merchantReferenceId: "capt_01JBTEST" })
    )
    expect(output.data?.session_id).toBe(SESSION_ID)
  })

  it("ignores an event whose transaction names no session", async () => {
    const { provider, client } = makeProvider()
    client.getTransactionDetails.mockResolvedValue({ messages: { resultCode: "Ok" } })
    const output = await provider.getWebhookActionAndData(
      signedWebhook("net.authorize.payment.priorAuthCapture.created", { merchantReferenceId: "" })
    )
    expect(output).toEqual({ action: PaymentActions.NOT_SUPPORTED })
  })

  it("ignores an event whose transaction cannot be read", async () => {
    const { provider, client, logger } = makeProvider()
    client.getTransactionDetails.mockRejectedValue(new Error("gateway down"))
    const output = await provider.getWebhookActionAndData(
      signedWebhook("net.authorize.payment.priorAuthCapture.created", { merchantReferenceId: undefined })
    )
    expect(output).toEqual({ action: PaymentActions.NOT_SUPPORTED })
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("could not read transaction 60001"))
  })

  it("reports a declined held transaction and asks to cancel the order", async () => {
    const { provider, logger } = makeProvider()
    const output = await provider.getWebhookActionAndData(signedWebhook("net.authorize.payment.fraud.declined"))
    expect(output.action).toBe(PaymentActions.FAILED)
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Cancel the order"))
  })

  it.each(["net.authorize.payment.refund.created", "net.authorize.payment.void.created"])(
    "logs %s without acting on it",
    async (eventType) => {
      const { provider, logger } = makeProvider()
      expect(await provider.getWebhookActionAndData(signedWebhook(eventType))).toEqual({ action: PaymentActions.NOT_SUPPORTED })
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("Medusa does not record refunds and voids"))
    }
  )

  it.each([
    "net.authorize.payment.authorization.created",
    "net.authorize.payment.authcapture.created",
    "net.authorize.payment.fraud.held",
    "net.authorize.customer.created",
  ])("does nothing for %s", async (eventType) => {
    const { provider, client, logger } = makeProvider()
    expect(await provider.getWebhookActionAndData(signedWebhook(eventType))).toEqual({ action: PaymentActions.NOT_SUPPORTED })
    expect(client.getTransactionDetails).not.toHaveBeenCalled()
    expect(logger.info).not.toHaveBeenCalled()
  })

  it.each(["string", "serialized"] as const)("reads a raw body delivered as a %s", async (rawAs) => {
    const { provider } = makeProvider()
    const output = await provider.getWebhookActionAndData(signedWebhook("net.authorize.payment.fraud.approved", {}, { rawAs }))
    expect(output.action).toBe(PaymentActions.AUTHORIZED)
  })

  describe("signature", () => {
    it("ignores a webhook signed with another key", async () => {
      const { provider, logger } = makeProvider()
      const output = await provider.getWebhookActionAndData(
        signedWebhook("net.authorize.payment.fraud.approved", {}, { key: "other-key" })
      )
      expect(output).toEqual({ action: PaymentActions.NOT_SUPPORTED })
      expect(logger.warn).toHaveBeenCalledWith("Authorize.net webhook failed the signature check, ignoring it")
    })

    it("ignores a body changed after signing", async () => {
      const { provider } = makeProvider()
      const webhook = signedWebhook("net.authorize.payment.fraud.approved")
      const forged = Buffer.from((webhook.rawData as Buffer).toString().replace("19.99", "0.01"))
      expect(await provider.getWebhookActionAndData({ ...webhook, rawData: forged })).toEqual({
        action: PaymentActions.NOT_SUPPORTED,
      })
    })

    it("ignores a webhook without the header or without the raw body", async () => {
      const { provider } = makeProvider()
      const webhook = signedWebhook("net.authorize.payment.fraud.approved")
      expect((await provider.getWebhookActionAndData({ ...webhook, headers: {} })).action).toBe(PaymentActions.NOT_SUPPORTED)
      expect((await provider.getWebhookActionAndData({ ...webhook, rawData: undefined as any })).action).toBe(
        PaymentActions.NOT_SUPPORTED
      )
    })

    it("ignores every webhook while no Signature Key is configured", async () => {
      const { provider, logger } = makeProvider({ signatureKey: undefined })
      expect((await provider.getWebhookActionAndData(signedWebhook("net.authorize.payment.fraud.approved"))).action).toBe(
        PaymentActions.NOT_SUPPORTED
      )
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("no Signature Key is configured"))
    })

    it("ignores a signed body that is not an event", async () => {
      const { provider, logger } = makeProvider()
      const body = "{}"
      const signature = createHmac("sha512", KEY).update(body).digest("hex")
      const output = await provider.getWebhookActionAndData({ data: {}, rawData: Buffer.from(body), headers: { "X-ANET-Signature": signature } })
      expect(output).toEqual({ action: PaymentActions.NOT_SUPPORTED })
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("carries no event"))
    })
  })
})
