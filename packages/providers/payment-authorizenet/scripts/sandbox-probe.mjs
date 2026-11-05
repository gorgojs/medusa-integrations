// Asks the Authorize.net sandbox what its documentation leaves open, before the provider relies on it:
//
//   1. a token from securePaymentContainerRequest (stands in for Accept.js in a browser);
//   2. whether a 33-character refId (a Medusa session id) is accepted and comes back as `transrefId`;
//   3. what a currency other than the account's gets;
//   4. whether a captured, unsettled transaction can be voided;
//   5. what a partial refund of an unsettled transaction gets;
//   6. the webhook signature: the X-ANET-Signature format, which key form matches, and whether the
//      payload carries merchantReferenceId. Needs a public URL, opened with localtunnel.
//
// Usage, from the package directory, after `yarn build`:
//   node scripts/sandbox-probe.mjs [--env <file>] [--skip-webhook]
//
// Keys come from CI_AUTHORIZENET_API_LOGIN_ID, CI_AUTHORIZENET_TRANSACTION_KEY and
// CI_AUTHORIZENET_SIGNATURE_KEY, read from the environment or from an env file (default: .env.test
// here, then ../../../integration-tests/payment-authorizenet/.env.test). The output carries codes and
// fields only, never a key, a token or card data.

import { spawn } from "node:child_process"
import { createHmac, randomBytes } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const PACKAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(import.meta.url)

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function loadEnv() {
  const candidates = [
    option("--env"),
    join(PACKAGE_DIR, ".env.test"),
    join(PACKAGE_DIR, "../../../integration-tests/payment-authorizenet/.env.test"),
  ].filter(Boolean)
  for (const file of candidates) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
      if (match && process.env[match[1]] === undefined) {
        // the templates end lines with `   # change this`, as dotenv allows
        const value = match[2].replace(/\s+#.*$/, "").replace(/^(['"])(.*)\1$/, "$2")
        if (value) process.env[match[1]] = value
      }
    }
    return file
  }
  return null
}

const envFile = loadEnv()
const apiLoginId = process.env.CI_AUTHORIZENET_API_LOGIN_ID
const transactionKey = process.env.CI_AUTHORIZENET_TRANSACTION_KEY
const signatureKey = process.env.CI_AUTHORIZENET_SIGNATURE_KEY

if (!apiLoginId || !transactionKey) {
  console.error(
    "Set CI_AUTHORIZENET_API_LOGIN_ID and CI_AUTHORIZENET_TRANSACTION_KEY (and CI_AUTHORIZENET_SIGNATURE_KEY for the webhook check)."
  )
  process.exit(1)
}

const built = join(PACKAGE_DIR, ".medusa/server/src/lib/authorizenet-client.js")
if (!existsSync(built)) {
  console.error('Build the package first: "yarn build".')
  process.exit(1)
}
const { AuthorizeNetClient, AUTHORIZENET_ENDPOINTS } = require(built)
const silent = { debug() {}, info() {}, warn() {}, error() {} }
const client = new AuthorizeNetClient({ environment: "sandbox", apiLoginId, transactionKey, logger: silent })

const CARD = { cardNumber: "4111111111111111", expirationDate: "2030-12", cardCode: "900" }
const BILL_TO = { firstName: "Probe", lastName: "Sandbox", address: "1 Main St", city: "Indianapolis", state: "IN", zip: "46201", country: "US" }

const results = { envFile, steps: {} }

function describeError(error) {
  return { type: error?.type, code: error?.anetCode, responseCode: error?.responseCode, message: error?.message }
}

async function token() {
  return client.securePaymentContainer(CARD)
}

async function transaction(type, extra = {}, refId) {
  const opaqueData = await token()
  return client.createTransaction(
    {
      transactionType: type,
      amount: extra.amount ?? "1.00",
      currencyCode: extra.currencyCode ?? "USD",
      payment: { opaqueData },
      billTo: BILL_TO,
    },
    refId
  )
}

function sessionLikeId() {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
  const bytes = randomBytes(26)
  return `payses_${Array.from(bytes, (b) => alphabet[b % 32]).join("")}`
}

async function step(name, run) {
  try {
    results.steps[name] = { ok: true, ...(await run()) }
  } catch (error) {
    results.steps[name] = { ok: false, error: describeError(error) }
  }
  console.error(`${name}: ${results.steps[name].ok ? "ok" : "failed"}`)
}

const toVoid = []

await step("1-token", async () => {
  const opaqueData = await token()
  return { dataDescriptor: opaqueData.dataDescriptor, dataValueLength: opaqueData.dataValue.length }
})

await step("2-refId-33", async () => {
  const refId = sessionLikeId()
  const result = await transaction("authOnlyTransaction", {}, refId)
  const transId = result.transactionResponse.transId
  toVoid.push(transId)
  const details = await client.getTransactionDetails(transId)
  return {
    refIdLength: refId.length,
    accepted: true,
    responseRefIdMatches: result.refId === refId,
    transrefIdMatches: details.transrefId === refId,
    transrefIdLength: details.transrefId?.length,
    transactionStatus: details.transaction?.transactionStatus,
  }
})

await step("3-foreign-currency", async () => {
  try {
    const result = await transaction("authCaptureTransaction", { currencyCode: "EUR" })
    toVoid.push(result.transactionResponse.transId)
    return { accepted: true, responseCode: result.responseCode }
  } catch (error) {
    return { accepted: false, ...describeError(error) }
  }
})

await step("4-void-captured-unsettled", async () => {
  const captured = await transaction("authCaptureTransaction", { amount: "2.00" })
  const transId = captured.transactionResponse.transId
  try {
    await client.createTransaction({ transactionType: "voidTransaction", refTransId: transId })
    const details = await client.getTransactionDetails(transId)
    return { voidAccepted: true, statusAfter: details.transaction?.transactionStatus }
  } catch (error) {
    return { voidAccepted: false, ...describeError(error) }
  }
})

await step("5-partial-refund-unsettled", async () => {
  const captured = await transaction("authCaptureTransaction", { amount: "3.00" })
  const transId = captured.transactionResponse.transId
  toVoid.push(transId)
  try {
    await client.createTransaction({
      transactionType: "refundTransaction",
      amount: "1.00",
      currencyCode: "USD",
      payment: { creditCard: { cardNumber: "1111", expirationDate: "XXXX" } },
      refTransId: transId,
    })
    return { refundAccepted: true }
  } catch (error) {
    return { refundAccepted: false, ...describeError(error) }
  }
})

async function rest(method, path, body) {
  const credentials = Buffer.from(`${apiLoginId}:${transactionKey}`).toString("base64")
  const response = await fetch(`${AUTHORIZENET_ENDPOINTS.sandbox.rest}${path}`, {
    method,
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  const text = (await response.text()).replace(/^\uFEFF/, "")
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

function openTunnel(port) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["--yes", "localtunnel", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] })
    const timer = setTimeout(() => reject(new Error("localtunnel did not print a URL within 60 s")), 60_000)
    child.stdout.on("data", (chunk) => {
      const match = /https:\/\/\S+/.exec(chunk.toString())
      if (match) {
        clearTimeout(timer)
        resolve({ url: match[0], close: () => child.kill() })
      }
    })
    child.on("error", reject)
  })
}

if (flag("--skip-webhook") || !signatureKey) {
  results.steps["6-webhook-signature"] = { skipped: !signatureKey ? "no CI_AUTHORIZENET_SIGNATURE_KEY" : "--skip-webhook" }
} else {
  await step("6-webhook-signature", async () => {
    let delivered
    const received = new Promise((resolve) => {
      delivered = resolve
    })
    const server = createServer((req, res) => {
      const chunks = []
      req.on("data", (c) => chunks.push(c))
      req.on("end", () => {
        res.writeHead(200).end()
        if (req.method === "POST") delivered({ headers: req.headers, raw: Buffer.concat(chunks) })
      })
    })
    await new Promise((resolve) => server.listen(0, resolve))
    const tunnel = await openTunnel(server.address().port)
    let webhookId
    try {
      const created = await rest("POST", "/webhooks", {
        name: "gorgo-sandbox-probe",
        url: `${tunnel.url}/anet-probe`,
        eventTypes: ["net.authorize.payment.authcapture.created"],
        status: "active",
      })
      webhookId = created.body?.webhookId
      if (!webhookId) {
        return { webhookCreated: false, status: created.status, body: created.body }
      }
      const refId = sessionLikeId()
      const captured = await transaction("authCaptureTransaction", { amount: "4.00" }, refId)
      toVoid.push(captured.transactionResponse.transId)

      const delivery = await Promise.race([
        received,
        new Promise((resolve) => setTimeout(() => resolve(null), 180_000)),
      ])
      if (!delivery) {
        return { webhookCreated: true, delivered: false }
      }
      const header = String(delivery.headers["x-anet-signature"] ?? "")
      const prefix = /^[a-z0-9]+=/i.exec(header)?.[0] ?? ""
      const digest = header.slice(prefix.length)
      const asString = createHmac("sha512", signatureKey).update(delivery.raw).digest("hex")
      const asBytes = /^[0-9a-f]+$/i.test(signatureKey)
        ? createHmac("sha512", Buffer.from(signatureKey, "hex")).update(delivery.raw).digest("hex")
        : null
      const payload = JSON.parse(delivery.raw.toString("utf8"))
      return {
        webhookCreated: true,
        delivered: true,
        headerPrefix: prefix,
        digestCase: digest === digest.toUpperCase() ? "upper" : digest === digest.toLowerCase() ? "lower" : "mixed",
        matchesKeyAsString: digest.toLowerCase() === asString,
        matchesKeyAsHexBytes: asBytes ? digest.toLowerCase() === asBytes : "key is not hex",
        payloadKeys: Object.keys(payload.payload ?? {}),
        merchantReferenceIdMatches: payload.payload?.merchantReferenceId === refId,
        eventType: payload.eventType,
        authAmountType: typeof payload.payload?.authAmount,
      }
    } finally {
      if (webhookId) await rest("DELETE", `/webhooks/${webhookId}`).catch(() => undefined)
      tunnel.close()
      server.close()
    }
  })
}

// leave the sandbox as it was: void what the probe left open or unsettled
for (const transId of toVoid.filter(Boolean)) {
  await client.createTransaction({ transactionType: "voidTransaction", refTransId: transId }).catch(() => undefined)
}

console.log(JSON.stringify(results, null, 2))
