import { fetchApishipPointsByIds } from "../points"

const makeCache = () => {
  const store = new Map<string, unknown>()
  return {
    store,
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value)
    }),
  }
}

const makeListsApi = () => ({
  getListPoints: jest.fn(async ({ filter }: { filter?: string; fields?: string; limit?: number }) => {
    const ids = (filter ?? "").replace(/^id=\[|\]$/g, "").split(",").filter(Boolean)
    return { data: { rows: ids.map((id) => ({ id: Number(id) })) } }
  }),
})

describe("fetchApishipPointsByIds", () => {
  it("returns nothing and calls nobody for an empty id list", async () => {
    const listsApi = makeListsApi()
    const cache = makeCache()

    const points = await fetchApishipPointsByIds({ listsApi, cache, providerId: "int_apiship", pointIds: [] })

    expect(points).toEqual([])
    expect(listsApi.getListPoints).not.toHaveBeenCalled()
  })

  it("asks for every point in chunks, each with a limit that fits the chunk", async () => {
    const listsApi = makeListsApi()
    const cache = makeCache()
    const pointIds = Array.from({ length: 250 }, (_, index) => index + 1)

    const points = await fetchApishipPointsByIds({ listsApi, cache, providerId: "int_apiship", pointIds })

    expect(points).toHaveLength(250)
    expect(listsApi.getListPoints).toHaveBeenCalledTimes(3)
    expect(listsApi.getListPoints.mock.calls.map(([params]) => params.limit)).toEqual([100, 100, 50])
  })

  it("drops duplicate ids before asking", async () => {
    const listsApi = makeListsApi()
    const cache = makeCache()

    const points = await fetchApishipPointsByIds({
      listsApi,
      cache,
      providerId: "int_apiship",
      pointIds: [5, "5", 7, 7],
      fields: "id,name",
    })

    expect(points.map((point) => point.id)).toEqual([5, 7])
    expect(listsApi.getListPoints).toHaveBeenCalledWith({ filter: "id=[5,7]", limit: 2, fields: "id,name" })
  })

  it("serves a chunk from the cache on the second call", async () => {
    const listsApi = makeListsApi()
    const cache = makeCache()
    const input = { listsApi, cache, providerId: "int_apiship", pointIds: [1, 2, 3] }

    await fetchApishipPointsByIds(input)
    const points = await fetchApishipPointsByIds(input)

    expect(points).toHaveLength(3)
    expect(listsApi.getListPoints).toHaveBeenCalledTimes(1)
  })
})
