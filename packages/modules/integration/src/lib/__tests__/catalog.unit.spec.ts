import { loadCatalog, resetCatalogCacheForTests } from "../catalog"
import { FALLBACK_CATALOG } from "../catalog.generated"

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
})
