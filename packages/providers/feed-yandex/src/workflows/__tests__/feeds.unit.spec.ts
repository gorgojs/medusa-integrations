jest.mock(
  "@gorgo/telemetry",
  () => ({ createTelemetryClient: () => ({ track: () => {} }) }),
  { virtual: true }
)

import {
  createStep,
  createWorkflow,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createFeedsStep, createFeedsWorkflow, CreateFeedsWorkflowInput } from "../create-feeds"
import { deleteFeedsStep, deleteFeedsWorkflow, DeleteFeedsWorkflowInput } from "../delete-feeds"
import { updateFeedsWorkflow } from "../update-feeds"
import { makeContainer, makeFeed } from "./fakes"

const failStep = createStep("feeds-test-fail-step", async () => {
  throw new Error("downstream failure")
})

const createFeedsThenFail = createWorkflow(
  "feeds-test-create-then-fail",
  (input: WorkflowData<CreateFeedsWorkflowInput>) => {
    const feeds = createFeedsStep(input)
    failStep()
    return new WorkflowResponse(feeds)
  }
)

const deleteFeedsThenFail = createWorkflow(
  "feeds-test-delete-then-fail",
  (input: WorkflowData<DeleteFeedsWorkflowInput>) => {
    const ids = deleteFeedsStep(input.ids)
    failStep()
    return new WorkflowResponse(ids)
  }
)

describe("createFeedsWorkflow", () => {
  it("creates the feeds and returns them", async () => {
    const { container, feedService } = makeContainer()
    const input = [
      { file_name: "yandex", is_active: true, schedule: 60 },
      { file_name: "yandex-sale", is_active: false },
    ]

    const { result } = await createFeedsWorkflow(container).run({ input })

    expect(feedService.createFeeds).toHaveBeenCalledWith(input)
    expect(result).toEqual([
      expect.objectContaining({ file_name: "yandex", is_active: true, schedule: 60 }),
      expect.objectContaining({ file_name: "yandex-sale", is_active: false, schedule: 30 }),
    ])
    expect(feedService.feeds.size).toBe(2)
  })

  it("removes the created feeds when a later step fails", async () => {
    const { container, feedService } = makeContainer()

    await expect(
      createFeedsThenFail(container).run({ input: [{ file_name: "yandex", is_active: true }] })
    ).rejects.toMatchObject({ message: "downstream failure" })

    const [created] = await feedService.createFeeds.mock.results[0].value
    expect(feedService.deleteFeeds).toHaveBeenCalledWith([created.id])
    expect(feedService.feeds.size).toBe(0)
  })
})

describe("updateFeedsWorkflow", () => {
  it("applies the changes and returns the updated feeds", async () => {
    const { container, feedService } = makeContainer({
      feeds: [makeFeed({ id: "feed_1", title: "Old", schedule: 30, is_active: false })],
    })

    const { result } = await updateFeedsWorkflow(container).run({
      input: [{ id: "feed_1", title: "New", schedule: 60, is_active: true }],
    })

    expect(feedService.updateFeeds).toHaveBeenCalledWith([
      { id: "feed_1", title: "New", schedule: 60, is_active: true },
    ])
    expect(result).toEqual([expect.objectContaining({ id: "feed_1", title: "New", schedule: 60, is_active: true })])
    expect(feedService.feeds.get("feed_1")).toMatchObject({ title: "New", schedule: 60, is_active: true })
  })
})

describe("deleteFeedsWorkflow", () => {
  it("soft-deletes the feeds and returns their ids", async () => {
    const { container, feedService } = makeContainer({
      feeds: [makeFeed({ id: "feed_1" }), makeFeed({ id: "feed_2" })],
    })

    const { result } = await deleteFeedsWorkflow(container).run({ input: { ids: ["feed_1"] } })

    expect(result).toEqual(["feed_1"])
    expect(feedService.softDeleteFeeds).toHaveBeenCalledWith(["feed_1"])
    expect((await feedService.listFeeds()).map((feed) => feed.id)).toEqual(["feed_2"])
  })

  it("restores the feeds when a later step fails", async () => {
    const { container, feedService } = makeContainer({ feeds: [makeFeed({ id: "feed_1" })] })

    await expect(deleteFeedsThenFail(container).run({ input: { ids: ["feed_1"] } })).rejects.toMatchObject({
      message: "downstream failure",
    })

    expect(feedService.restoreFeeds).toHaveBeenCalledWith(["feed_1"])
    expect((await feedService.listFeeds()).map((feed) => feed.id)).toEqual(["feed_1"])
  })
})
