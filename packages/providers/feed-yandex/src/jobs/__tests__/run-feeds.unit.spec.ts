jest.mock(
  "@gorgo/telemetry",
  () => ({ createTelemetryClient: () => ({ track: () => {} }) }),
  { virtual: true }
)

import job, { config } from "../run-feeds"
import { makeContainer, makeFeed } from "../../workflows/__tests__/fakes"

describe("run-feeds job", () => {
  it("runs every minute", () => {
    expect(config).toEqual({ name: "run-feeds", schedule: "* * * * *" })
  })

  it("exports the feeds that are due and logs how many", async () => {
    const { container, fileService, logger } = makeContainer({
      feeds: [
        makeFeed({ id: "feed_new", file_name: "new" }),
        makeFeed({ id: "feed_due", file_name: "due", last_export_at: new Date(Date.now() - 45 * 60 * 1000) }),
        makeFeed({ id: "feed_off", file_name: "off", is_active: false }),
      ],
    })

    await job(container as any)

    expect(fileService.createFiles).toHaveBeenCalledTimes(2)
    expect(logger.info).toHaveBeenCalledWith("Feeds exported: 2")
  })

  it("stays silent when no feed is due", async () => {
    const { container, fileService, logger } = makeContainer({
      feeds: [makeFeed({ id: "feed_fresh", last_export_at: new Date(Date.now() - 5 * 60 * 1000) })],
    })

    await job(container as any)

    expect(fileService.createFiles).not.toHaveBeenCalled()
    expect(logger.info).not.toHaveBeenCalled()
  })
})
