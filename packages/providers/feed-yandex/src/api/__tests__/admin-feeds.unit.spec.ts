jest.mock(
  "@gorgo/telemetry",
  () => ({ createTelemetryClient: () => ({ track: () => {} }) }),
  { virtual: true }
)

import * as feedsRoute from "../admin/feeds/route"
import * as feedRoute from "../admin/feeds/[id]/route"
import * as launchRoute from "../admin/feeds/[id]/launch/route"
import * as deleteFileRoute from "../admin/feeds/[id]/delete-file/route"
import { makeContainer, makeFeed, makeResponse, onlyFile } from "../../workflows/__tests__/fakes"

function request(container: unknown, extra: Record<string, unknown> = {}) {
  return { scope: container, params: {}, ...extra } as any
}

describe("GET /admin/feeds", () => {
  it("lists the feeds with the paging the query reports", async () => {
    const { container, query } = makeContainer({
      feeds: [makeFeed({ id: "feed_1" }), makeFeed({ id: "feed_2" })],
    })
    const queryConfig = { fields: ["id", "title"], pagination: { take: 20, skip: 0 } }
    const res = makeResponse()

    await feedsRoute.GET(request(container, { queryConfig }), res as any)

    expect(query.graph).toHaveBeenCalledWith({ entity: "feed", ...queryConfig })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      feeds: [expect.objectContaining({ id: "feed_1" }), expect.objectContaining({ id: "feed_2" })],
      count: 2,
      limit: 20,
      offset: 0,
    })
  })
})

describe("POST /admin/feeds", () => {
  it("creates the feeds from the body and returns the first one", async () => {
    const { container, feedService } = makeContainer()
    const res = makeResponse()

    await feedsRoute.POST(
      request(container, {
        validatedBody: { feeds: [{ title: "Yandex", file_name: "yandex", is_active: true, schedule: 60 }] },
      }),
      res as any
    )

    expect(feedService.createFeeds).toHaveBeenCalledWith([
      { title: "Yandex", file_name: "yandex", is_active: true, schedule: 60 },
    ])
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      feed: expect.objectContaining({ title: "Yandex", file_name: "yandex", is_active: true, schedule: 60 }),
    })
  })
})

describe("GET /admin/feeds/:id", () => {
  it("returns the feed with the requested fields", async () => {
    const { container, query } = makeContainer({ feeds: [makeFeed({ id: "feed_1", title: "Main" })] })
    const res = makeResponse()

    await feedRoute.GET(
      request(container, { params: { id: "feed_1" }, queryConfig: { fields: ["id", "title", "settings"] } }),
      res as any
    )

    expect(query.graph).toHaveBeenCalledWith(
      { entity: "feed", filters: { id: "feed_1" }, fields: ["id", "title", "settings"] },
      { throwIfKeyNotFound: true }
    )
    expect(res.json).toHaveBeenCalledWith({ feed: expect.objectContaining({ id: "feed_1", title: "Main" }) })
  })

  it("asks for every field when no query config is set", async () => {
    const { container, query } = makeContainer({ feeds: [makeFeed({ id: "feed_1" })] })

    await feedRoute.GET(request(container, { params: { id: "feed_1" } }), makeResponse() as any)

    expect(query.graph).toHaveBeenCalledWith(expect.objectContaining({ fields: ["*"] }), { throwIfKeyNotFound: true })
  })

  it("fails for an unknown feed", async () => {
    const { container } = makeContainer()

    await expect(
      feedRoute.GET(request(container, { params: { id: "feed_missing" } }), makeResponse() as any)
    ).rejects.toThrow("feed was not found")
  })
})

describe("PATCH /admin/feeds/:id", () => {
  it("saves the changes, settings included, and returns the fresh feed", async () => {
    const { container, feedService } = makeContainer({ feeds: [makeFeed({ id: "feed_1", title: "Old" })] })
    const settings = {
      name: "Gorgo Store",
      company: "Gorgo LLC",
      url: "https://store.example.com",
      platform: "Medusa",
      categories: [{ id: "pcat_shoes", value: "Shoes" }],
    }
    const res = makeResponse()

    await feedRoute.PATCH(
      request(container, { params: { id: "feed_1" }, validatedBody: { id: "feed_1", title: "New", settings } }),
      res as any
    )

    expect(feedService.feeds.get("feed_1")).toMatchObject({ title: "New", settings })
    expect(res.json).toHaveBeenCalledWith({ feed: expect.objectContaining({ id: "feed_1", title: "New", settings }) })
  })
})

describe("DELETE /admin/feeds/:id", () => {
  it("soft-deletes the feed", async () => {
    const { container, feedService } = makeContainer({ feeds: [makeFeed({ id: "feed_1" })] })
    const res = makeResponse()

    await feedRoute.DELETE(request(container, { params: { id: "feed_1" } }), res as any)

    expect(feedService.softDeleteFeeds).toHaveBeenCalledWith(["feed_1"])
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ id: "feed_1", object: "feed", deleted: true })
  })
})

describe("POST /admin/feeds/:id/launch", () => {
  it("generates the feed right away and returns its new state", async () => {
    const { container, fileService, feedService } = makeContainer({
      feeds: [makeFeed({ id: "feed_1", file_name: "main", is_active: false })],
    })
    const res = makeResponse()

    await launchRoute.POST(request(container, { params: { id: "feed_1" } }), res as any)

    const file = onlyFile(fileService)
    expect(file.filename).toBe("main.xml.gz")
    expect(feedService.feeds.get("feed_1")!.file_path).toBe(file.url)
    expect(res.json).toHaveBeenCalledWith({ feed: [expect.objectContaining({ id: "feed_1", file_path: file.url })] })
  })
})

describe("DELETE /admin/feeds/:id/delete-file", () => {
  it("deletes the exported file and clears the feed", async () => {
    const { container, fileService, feedService } = makeContainer({
      feeds: [
        makeFeed({
          id: "feed_1",
          file_path: "http://localhost:9000/static/1700000000001-main.xml.gz",
          last_export_at: new Date("2026-10-01T10:00:00.000Z"),
        }),
      ],
    })
    const res = makeResponse()

    await deleteFileRoute.DELETE(request(container, { params: { id: "feed_1" } }), res as any)

    expect(fileService.deleteFiles).toHaveBeenCalledWith(["1700000000001-main.xml.gz"])
    expect(feedService.feeds.get("feed_1")).toMatchObject({ file_path: "", last_export_at: null })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ id: "feed_1", object: "feed-file", deleted: true })
  })
})
