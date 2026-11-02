jest.mock(
  "@gorgo/telemetry",
  () => ({ createTelemetryClient: () => ({ track: () => {} }) }),
  { virtual: true }
)

import { gzipSync } from "zlib"
import { GET } from "../feeds/[id]/[fileName]/route"
import { runFeedsWorkflow } from "../../workflows/run-feeds"
import { makeContainer, makeFeed, makeProduct, makeResponse, onlyFile } from "../../workflows/__tests__/fakes"

type Deps = ReturnType<typeof makeContainer>

async function download(deps: Deps, id: string, fileName: string) {
  const res = makeResponse()
  await GET({ scope: deps.container, params: { id, fileName } } as any, res as any)
  return res
}

function exportedFeed(fileName: string) {
  return makeContainer({
    feeds: [
      makeFeed({
        id: "feed_1",
        file_name: fileName,
        settings: { name: "Gorgo Store", categories: [{ id: "pcat_shoes", value: "Shoes" }] },
      }),
    ],
    products: [makeProduct({ id: "prod_sneaker", title: "Runner Sneaker", category_ids: ["pcat_shoes"] })],
  })
}

describe("GET /feeds/:id/:fileName", () => {
  it("serves the generated feed as uncompressed XML", async () => {
    const deps = exportedFeed("main")
    await runFeedsWorkflow(deps.container).run({ input: { ids: ["feed_1"] } })
    const file = onlyFile(deps.fileService)

    const res = await download(deps, "feed_1", "main.xml")

    expect(deps.fileService.getAsBuffer).toHaveBeenCalledWith(file.id)
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/xml")
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="main.xml"')
    const body = res.send.mock.calls[0][0].toString("utf-8")
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(body).toContain("<name>Runner Sneaker</name>")
    expect(res.status).not.toHaveBeenCalled()
  })

  it("finds a stored file whose name was percent-encoded in its url", async () => {
    const deps = exportedFeed("летняя распродажа")
    await runFeedsWorkflow(deps.container).run({ input: { ids: ["feed_1"] } })
    const file = onlyFile(deps.fileService)
    expect(file.url).not.toContain(" ")

    const res = await download(deps, "feed_1", "летняя распродажа.xml")

    expect(deps.fileService.getAsBuffer).toHaveBeenCalledWith(file.id)
    expect(res.send).toHaveBeenCalledTimes(1)
  })

  it("answers 404 for an unknown feed", async () => {
    const deps = makeContainer()

    const res = await download(deps, "feed_missing", "main.xml")

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: "Feed not found" })
  })

  it.each([
    ["has never been exported", { file_path: null }],
    ["has an empty file path", { file_path: "" }],
    ["has no file name", { file_name: null, file_path: "http://localhost:9000/static/1-main.xml.gz" }],
  ])("answers 404 when the feed %s", async (_, overrides) => {
    const deps = makeContainer({ feeds: [makeFeed({ id: "feed_1", file_name: "main", ...overrides })] })

    const res = await download(deps, "feed_1", "main.xml")

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: "Feed file info missing" })
  })

  it.each(["other.xml", "main", "main.xml.gz", "MAIN.xml"])("answers 404 when %s is asked for feed main", async (fileName) => {
    const deps = makeContainer({
      feeds: [makeFeed({ id: "feed_1", file_name: "main", file_path: "http://localhost:9000/static/1-main.xml.gz" })],
    })

    const res = await download(deps, "feed_1", fileName)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: "File name does not match" })
    expect(deps.fileService.getAsBuffer).not.toHaveBeenCalled()
  })

  it("answers 400 when the stored file path is not a url", async () => {
    const deps = makeContainer({
      feeds: [makeFeed({ id: "feed_1", file_name: "main", file_path: "static/1-main.xml.gz" })],
    })

    const res = await download(deps, "feed_1", "main.xml")

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid file path format" })
  })

  it("answers 500 when the stored file is gone", async () => {
    const deps = makeContainer({
      feeds: [makeFeed({ id: "feed_1", file_name: "main", file_path: "http://localhost:9000/static/1-main.xml.gz" })],
    })

    const res = await download(deps, "feed_1", "main.xml")

    expect(deps.fileService.getAsBuffer).toHaveBeenCalledWith("1-main.xml.gz")
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" })
  })

  it("answers 500 when the stored file is not gzipped", async () => {
    const deps = makeContainer({
      feeds: [makeFeed({ id: "feed_1", file_name: "main", file_path: "http://localhost:9000/static/1-main.xml.gz" })],
    })
    deps.fileService.getAsBuffer.mockResolvedValueOnce(Buffer.from("<yml_catalog/>"))

    const res = await download(deps, "feed_1", "main.xml")

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.send).not.toHaveBeenCalled()
  })

  it("serves a gzipped file uploaded by another provider", async () => {
    const deps = makeContainer({
      feeds: [
        makeFeed({
          id: "feed_1",
          file_name: "main",
          file_path: "https://bucket.s3.eu-central-1.amazonaws.com/main-01JABCDEF.xml.gz",
        }),
      ],
    })
    deps.fileService.getAsBuffer.mockResolvedValueOnce(gzipSync(Buffer.from("<yml_catalog/>")))

    const res = await download(deps, "feed_1", "main.xml")

    expect(deps.fileService.getAsBuffer).toHaveBeenCalledWith("main-01JABCDEF.xml.gz")
    expect(res.send.mock.calls[0][0].toString("utf-8")).toBe("<yml_catalog/>")
  })
})
