// Pulls the Authorize.net XSD and distils the element order of the types this package builds.
//
//   node scripts/spec-pull.mjs          download, write spec/SPEC_VERSION.txt and spec/element-order.json
//   node scripts/spec-pull.mjs --check  download, compare sha256 with spec/SPEC_VERSION.txt, write nothing
//
// The XSD itself has no license, so it only ever lands in node_modules/.cache (never in git).

import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const XSD_URL = "https://api.authorize.net/xml/v1/schema/AnetApiSchema.xsd"
const PACKAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..")
const CACHE_FILE = join(PACKAGE_DIR, "node_modules", ".cache", "authorizenet", "AnetApiSchema.xsd")
const VERSION_FILE = join(PACKAGE_DIR, "spec", "SPEC_VERSION.txt")
const ORDER_FILE = join(PACKAGE_DIR, "spec", "element-order.json")

const TYPES = [
  "ANetApiRequest",
  "createTransactionRequest",
  "transactionRequestType",
  "paymentType",
  "opaqueDataType",
  "creditCardType",
  "customerDataType",
  "customerAddressType",
  "nameAndAddressType",
  "settingType",
  "userField",
  "getTransactionDetailsRequest",
  "getMerchantDetailsRequest",
  "authenticateTestRequest",
  "securePaymentContainerRequest",
  "webCheckOutDataType",
]

const check = process.argv.includes("--check")

// --- download ---------------------------------------------------------------

async function download() {
  const response = await fetch(XSD_URL, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) {
    throw new Error(`GET ${XSD_URL} failed: ${response.status} ${response.statusText}`)
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  return {
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    lastModified: response.headers.get("last-modified") ?? "unknown",
  }
}

// --- a small XML tag tree ---------------------------------------------------

/** Parses XML into `{ name, attrs, children }` nodes. Comments, PIs and text are dropped. */
function parseXml(source) {
  const root = { name: "#root", attrs: {}, children: [] }
  const stack = [root]
  const tag = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<(\/?)([^\s>/]+)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
  let match
  while ((match = tag.exec(source))) {
    const [, closing, rawName, rawAttrs, selfClosing] = match
    if (rawName === undefined) continue
    const name = rawName.replace(/^[^:]+:/, "")
    if (closing) {
      if (stack.length > 1) stack.pop()
      continue
    }
    const attrs = {}
    for (const a of rawAttrs.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs[a[1]] = a[2] ?? a[3]
    }
    const node = { name, attrs, children: [] }
    stack[stack.length - 1].children.push(node)
    if (!selfClosing) stack.push(node)
  }
  return root
}

const localName = (qname) => (qname ?? "").replace(/^[^:]+:/, "")

// --- element order ----------------------------------------------------------

/** Collects the direct child elements of a node, descending into sequence/choice/all only. */
function collectElements(node, out) {
  for (const child of node.children) {
    if (child.name === "element") {
      out.push(child.attrs.name ?? localName(child.attrs.ref))
    } else if (["sequence", "choice", "all"].includes(child.name)) {
      collectElements(child, out)
    }
  }
}

function elementsOf(definition, byName, trail = []) {
  const complexType =
    definition.name === "complexType"
      ? definition
      : definition.children.find((c) => c.name === "complexType")
  if (!complexType) {
    throw new Error(`"${definition.attrs.name}" has no complexType to read elements from`)
  }

  const content = complexType.children.find((c) => c.name === "complexContent")
  const extension = content?.children.find((c) => c.name === "extension")
  const host = extension ?? complexType

  const out = []
  if (extension) {
    const baseName = localName(extension.attrs.base)
    if (trail.includes(baseName)) throw new Error(`Circular base type: ${[...trail, baseName].join(" -> ")}`)
    const base = byName.get(baseName)
    if (!base) throw new Error(`Base type "${baseName}" not found`)
    out.push(...elementsOf(base, byName, [...trail, baseName]))
  }
  collectElements(host, out)
  return out
}

function buildElementOrder(xsd) {
  const schema = parseXml(xsd).children.find((c) => c.name === "schema")
  if (!schema) throw new Error("No xs:schema root in the downloaded document")

  // A name can be both a complexType and an element, so look types up first for the plain type names
  // and elements first for the requests (they are the ones with an anonymous complexType).
  const types = new Map()
  const elements = new Map()
  for (const child of schema.children) {
    if (child.name === "complexType" && child.attrs.name) types.set(child.attrs.name, child)
    if (child.name === "element" && child.attrs.name) elements.set(child.attrs.name, child)
  }

  const find = (name) => {
    const element = elements.get(name)
    if (element && element.children.some((c) => c.name === "complexType")) return element
    return types.get(name) ?? null
  }

  const result = {}
  for (const name of TYPES) {
    const definition = find(name)
    if (!definition) throw new Error(`Type or element "${name}" not found in the schema`)
    result[name] = elementsOf(definition, types)
  }

  // The named type of webCheckOutDataType's `token` element is recorded under its own name.
  const webCheckOut = types.get("webCheckOutDataType")
  const tokenElement = webCheckOut.children
    .flatMap(function flat(n) {
      return n.name === "element" ? [n] : n.children.flatMap(flat)
    })
    .find((e) => e.attrs.name === "token")
  const tokenType = localName(tokenElement?.attrs.type)
  if (!tokenType) throw new Error('webCheckOutDataType has no typed "token" element')
  const tokenDefinition = types.get(tokenType)
  if (!tokenDefinition) throw new Error(`Type "${tokenType}" (token of webCheckOutDataType) not found`)
  result[tokenType] = elementsOf(tokenDefinition, types)

  return result
}

// --- main -------------------------------------------------------------------

async function main() {
  const { bytes, sha256, lastModified } = await download()

  if (check) {
    let recorded
    try {
      recorded = /^sha256=(.+)$/m.exec(await readFile(VERSION_FILE, "utf8"))?.[1]?.trim()
    } catch {
      recorded = undefined
    }
    if (!recorded) {
      console.error(`No sha256 recorded in ${VERSION_FILE}. Run "yarn spec:pull" first.`)
      process.exit(1)
    }
    if (recorded === sha256) {
      console.log("spec unchanged")
      return
    }
    console.error("spec changed")
    console.error(`  recorded: ${recorded}`)
    console.error(`  upstream: ${sha256}`)
    process.exit(1)
  }

  await mkdir(dirname(CACHE_FILE), { recursive: true })
  await writeFile(CACHE_FILE, bytes)

  const order = buildElementOrder(bytes.toString("utf8").replace(/^\uFEFF/, ""))

  await mkdir(dirname(VERSION_FILE), { recursive: true })
  await writeFile(
    VERSION_FILE,
    [
      `url=${XSD_URL}`,
      `sha256=${sha256}`,
      `last-modified=${lastModified}`,
      `pulled=${new Date().toISOString().slice(0, 10)}`,
      "",
    ].join("\n"),
  )
  await writeFile(ORDER_FILE, `${JSON.stringify(order, null, 2)}\n`)

  console.log(`sha256=${sha256}`)
  console.log(`wrote ${Object.keys(order).length} types to spec/element-order.json`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
