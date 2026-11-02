jest.mock(
  "@gorgo/telemetry",
  () => ({ createTelemetryClient: () => ({ track: () => {} }) }),
  { virtual: true }
)

import { deleteFeedFilesWorkflow } from "../delete-feed-files"
import { makeContainer, makeFeed } from "./fakes"

async function deleteFilesOf(feeds: ReturnType<typeof makeFeed>[], ids = feeds.map((feed) => feed.id)) {
  const deps = makeContainer({ feeds })
  const { result } = await deleteFeedFilesWorkflow(deps.container).run({ input: { ids } })
  return { ...deps, result }
}

describe("deleteFeedFilesWorkflow", () => {
  it("deletes the stored file each feed points to", async () => {
    const { fileService } = await deleteFilesOf([
      makeFeed({ id: "feed_a", file_path: "http://localhost:9000/static/1700000000001-a.xml.gz" }),
      makeFeed({ id: "feed_b", file_path: "https://cdn.example.com/feeds/1700000000002-b.xml.gz" }),
    ])

    expect(fileService.deleteFiles).toHaveBeenCalledTimes(1)
    expect(fileService.deleteFiles).toHaveBeenCalledWith([
      "1700000000001-a.xml.gz",
      "1700000000002-b.xml.gz",
    ])
  })

  it("ignores the query string and fragment of the file url", async () => {
    const { fileService } = await deleteFilesOf([
      makeFeed({
        id: "feed_signed",
        file_path: "https://bucket.example.com/1700000000003-signed.xml.gz?X-Amz-Signature=abc&X-Amz-Expires=60#top",
      }),
    ])

    expect(fileService.deleteFiles).toHaveBeenCalledWith(["1700000000003-signed.xml.gz"])
  })

  it.each([
    ["no path", null],
    ["an empty path", ""],
    ["a blank path", "   "],
    ["a path ending in a slash", "http://localhost:9000/static/"],
    ["a path without a file extension", "http://localhost:9000/static/feeds"],
  ])("deletes nothing for a feed with %s", async (_, filePath) => {
    const { fileService } = await deleteFilesOf([makeFeed({ id: "feed_a", file_path: filePath })])

    expect(fileService.deleteFiles).toHaveBeenCalledWith([])
  })

  it("clears the file path and export time of every feed", async () => {
    const { feedService } = await deleteFilesOf([
      makeFeed({
        id: "feed_a",
        file_path: "http://localhost:9000/static/1700000000001-a.xml.gz",
        last_export_at: new Date("2026-10-01T10:00:00.000Z"),
      }),
      makeFeed({ id: "feed_b", file_path: null, last_export_at: null }),
    ])

    expect(feedService.feeds.get("feed_a")).toMatchObject({ file_path: "", last_export_at: null })
    expect(feedService.feeds.get("feed_b")).toMatchObject({ file_path: "", last_export_at: null })
  })

  it("touches only the requested feeds", async () => {
    const { feedService, fileService } = await deleteFilesOf(
      [
        makeFeed({ id: "feed_a", file_path: "http://localhost:9000/static/1700000000001-a.xml.gz" }),
        makeFeed({ id: "feed_b", file_path: "http://localhost:9000/static/1700000000002-b.xml.gz" }),
      ],
      ["feed_a"]
    )

    expect(fileService.deleteFiles).toHaveBeenCalledWith(["1700000000001-a.xml.gz"])
    expect(feedService.feeds.get("feed_b")!.file_path).toBe("http://localhost:9000/static/1700000000002-b.xml.gz")
  })

  it("returns the ids it was given", async () => {
    const { result } = await deleteFilesOf([makeFeed({ id: "feed_a" }), makeFeed({ id: "feed_b" })])

    expect(result).toEqual(["feed_a", "feed_b"])
  })

  it.skip("decodes a percent-encoded file name before deleting the file", async () => {
    const { fileService } = await deleteFilesOf([
      makeFeed({ id: "feed_a", file_path: "http://localhost:9000/static/1700000000001-summer%20sale.xml.gz" }),
    ])

    expect(fileService.deleteFiles).toHaveBeenCalledWith(["1700000000001-summer sale.xml.gz"])
  })
})
