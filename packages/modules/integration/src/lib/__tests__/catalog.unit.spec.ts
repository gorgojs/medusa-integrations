import { loadCatalog, resetCatalogCacheForTests } from "../catalog"
import { FALLBACK_CATALOG } from "../catalog.generated"
import { MD_MAX_CHARS } from "../markdown/parse"

const remoteItem = {
  integrationId: "remote-only",
  slug: "gorgo-remote",
  npm: "@gorgo/remote",
  category: "payment",
  author: "gorgo",
  authorLocalized: "Gorgo",
  label: "Remote Only",
  shortDescription: "from the api",
  repository: "https://example.com",
  docsUrl: "https://example.com/docs",
  icon: "/api/plugin-icon?slug=gorgo-remote",
  stars: 1,
  downloads: null,
}

const okResponse = (integrations: any[]) => ({
  ok: true,
  status: 200,
  json: async () => ({ integrations }),
})

describe("loadCatalog", () => {
  const realFetch = global.fetch
  beforeEach(() => resetCatalogCacheForTests())
  afterEach(() => {
    global.fetch = realFetch
    jest.restoreAllMocks()
  })

  it("returns the remote catalog on success", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse([remoteItem])) as any
    expect(await loadCatalog()).toEqual([remoteItem])
  })

  it("caches within the TTL (no second fetch)", async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse([remoteItem]))
    global.fetch = fetchMock as any
    await loadCatalog()
    await loadCatalog()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("falls back to FALLBACK_CATALOG when the fetch rejects", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as any
    expect(await loadCatalog()).toBe(FALLBACK_CATALOG)
  })

  it("falls back when the response is not ok", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }) as any
    expect(await loadCatalog()).toBe(FALLBACK_CATALOG)
  })

  it("falls back when the response shape is invalid", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse([{ nope: true }])) as any
    expect(await loadCatalog()).toBe(FALLBACK_CATALOG)
  })

  it("serves the last-good cache when a later fetch fails after TTL expiry", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_000)
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(okResponse([remoteItem]))
      .mockRejectedValue(new Error("offline"))
    global.fetch = fetchMock as any

    expect(await loadCatalog()).toEqual([remoteItem]) // fetch #1 → cached at t=1000

    nowSpy.mockReturnValue(1_000 + 60 * 60 * 1000 + 1) // past the 1h TTL
    const second = await loadCatalog() // stale → fetch #2 rejects → last-good, not yml
    expect(second).toEqual([remoteItem])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("keeps a well-formed docsSnippet", async () => {
    const snippet = { en: "## Install", ru: "## Установка" }
    global.fetch = jest
      .fn()
      .mockResolvedValue(okResponse([{ ...remoteItem, docsSnippet: snippet }])) as any
    const [entry] = await loadCatalog()
    expect(entry.docsSnippet).toEqual(snippet)
  })

  it.each([
    ["a string", "## Install"],
    ["an array", ["## Install"]],
    ["null", null],
    ["non-string members", { en: 1, ru: 2 }],
  ])("drops a malformed docsSnippet (%s) but keeps the entry", async (_label, docsSnippet) => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(okResponse([{ ...remoteItem, docsSnippet }])) as any
    const [entry] = await loadCatalog()
    expect(entry.docsSnippet).toBeUndefined()
    expect(entry.integrationId).toBe("remote-only")
  })

  it("keeps a single-locale docsSnippet (ru absent)", async () => {
    const snippet = { en: "## Install" }
    global.fetch = jest
      .fn()
      .mockResolvedValue(okResponse([{ ...remoteItem, docsSnippet: snippet }])) as any
    const [entry] = await loadCatalog()
    expect(entry.docsSnippet).toEqual(snippet)
  })

  it("drops docsSnippet when both locales are oversized, but keeps the entry", async () => {
    const oversized = "x".repeat(MD_MAX_CHARS + 1)
    const docsSnippet = { en: oversized, ru: oversized }
    global.fetch = jest
      .fn()
      .mockResolvedValue(okResponse([{ ...remoteItem, docsSnippet }])) as any
    const [entry] = await loadCatalog()
    expect(entry.docsSnippet).toBeUndefined()
    expect(entry.integrationId).toBe("remote-only")
  })

  it("drops only the oversized locale, keeping the usable one", async () => {
    const docsSnippet = { en: "x".repeat(MD_MAX_CHARS + 1), ru: "## Установка" }
    global.fetch = jest
      .fn()
      .mockResolvedValue(okResponse([{ ...remoteItem, docsSnippet }])) as any
    const [entry] = await loadCatalog()
    expect(entry.docsSnippet).toEqual({ ru: "## Установка" })
  })

  it("drops an unsafe docsUrl but keeps the entry", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(okResponse([{ ...remoteItem, docsUrl: "javascript:alert(1)" }])) as any
    const [entry] = await loadCatalog()
    expect(entry.docsUrl).toBeUndefined()
    expect(entry.integrationId).toBe("remote-only")
  })

  it("keeps a valid https docsUrl", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(okResponse([{ ...remoteItem, docsUrl: "https://example.com/docs" }])) as any
    const [entry] = await loadCatalog()
    expect(entry.docsUrl).toBe("https://example.com/docs")
  })

  const rub = (days: number, amount: number) => ({ days, amount, currencyCode: "RUB" })
  const checkoutUrl = "https://app.gorgojs.ru/checkout/1c"

  it("keeps a well-formed pricing with its terms shortest first", async () => {
    const pricing = { terms: [rub(365, 4000), rub(31, 500)], monthly: rub(31, 500), checkoutUrl }
    global.fetch = jest.fn().mockResolvedValue(okResponse([{ ...remoteItem, pricing }])) as any
    const [entry] = await loadCatalog()
    expect(entry.pricing).toEqual({
      terms: [rub(31, 500), rub(365, 4000)],
      monthly: rub(31, 500),
      checkoutUrl,
    })
  })

  it("has no monthly price for an integration sold by the year only", async () => {
    const pricing = { terms: [rub(365, 4000)], monthly: null, checkoutUrl }
    global.fetch = jest.fn().mockResolvedValue(okResponse([{ ...remoteItem, pricing }])) as any
    const [entry] = await loadCatalog()
    expect(entry.pricing).toEqual({ terms: [rub(365, 4000)], monthly: null, checkoutUrl })
  })

  it("drops a bad term but keeps the usable ones", async () => {
    const pricing = {
      terms: [rub(31, 500), rub(0, 1), rub(93, 0), { days: "365", amount: 1, currencyCode: "RUB" }, null],
      monthly: rub(31, 500),
      checkoutUrl,
    }
    global.fetch = jest.fn().mockResolvedValue(okResponse([{ ...remoteItem, pricing }])) as any
    const [entry] = await loadCatalog()
    expect(entry.pricing?.terms).toEqual([rub(31, 500)])
  })

  it.each([
    ["an unsafe checkout", { terms: [rub(31, 500)], monthly: null, checkoutUrl: "javascript:alert(1)" }],
    ["an http checkout", { terms: [rub(31, 500)], monthly: null, checkoutUrl: "http://example.com" }],
    ["no usable term", { terms: [rub(0, 500)], monthly: null, checkoutUrl }],
    ["terms of another shape", { terms: { days: 31 }, monthly: null, checkoutUrl }],
    ["a string", "500 RUB"],
    ["null", null],
  ])("drops a malformed pricing (%s) but keeps the entry", async (_label, pricing) => {
    global.fetch = jest.fn().mockResolvedValue(okResponse([{ ...remoteItem, pricing }])) as any
    const [entry] = await loadCatalog()
    expect(entry.pricing).toBeUndefined()
    expect(entry.integrationId).toBe("remote-only")
  })
})
