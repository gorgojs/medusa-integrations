import { AdminCreateFeed, AdminGetFeedsParams } from "../admin/feeds/validators"
import { AdminUpdateFeed } from "../admin/feeds/[id]/validators"
import * as listQueryConfig from "../admin/feeds/query-config"
import * as detailQueryConfig from "../admin/feeds/[id]/query-config"

describe("AdminCreateFeed", () => {
  it("accepts feeds with a title, file name and active flag", () => {
    const result = AdminCreateFeed.safeParse({
      feeds: [
        { title: "Yandex", file_name: "yandex", is_active: true, schedule: 60 },
        { title: "Sale", file_name: "sale", is_active: false },
      ],
    })

    expect(result.success).toBe(true)
  })

  it.each([
    ["title", { file_name: "yandex", is_active: true }],
    ["file_name", { title: "Yandex", is_active: true }],
    ["is_active", { title: "Yandex", file_name: "yandex" }],
  ])("rejects a feed without %s", (_, feed) => {
    expect(AdminCreateFeed.safeParse({ feeds: [feed] }).success).toBe(false)
  })

  it("rejects a schedule that is not a number", () => {
    const result = AdminCreateFeed.safeParse({
      feeds: [{ title: "Yandex", file_name: "yandex", is_active: true, schedule: "60" }],
    })

    expect(result.success).toBe(false)
  })

  it("rejects a body without a feeds list", () => {
    expect(AdminCreateFeed.safeParse({ title: "Yandex", file_name: "yandex", is_active: true }).success).toBe(false)
  })
})

describe("AdminGetFeedsParams", () => {
  it("pages 20 feeds at a time from the start by default", () => {
    expect(AdminGetFeedsParams.parse({})).toMatchObject({ limit: 20, offset: 0 })
  })

  it("reads limit and offset from query strings", () => {
    expect(AdminGetFeedsParams.parse({ limit: "5", offset: "10" })).toMatchObject({ limit: 5, offset: 10 })
  })
})

describe("AdminUpdateFeed", () => {
  it("accepts the shop settings and the selected categories", () => {
    const body = {
      id: "feed_1",
      settings: {
        name: "Gorgo Store",
        company: "Gorgo LLC",
        url: "https://store.example.com",
        platform: "Medusa",
        categories: [
          { id: "pcat_shoes", value: "Shoes" },
          { id: "pcat_boots", parentId: "pcat_shoes", value: "Boots" },
        ],
      },
    }

    expect(AdminUpdateFeed.parse(body)).toEqual(body)
  })

  it("turns last_export_at into a date", () => {
    const parsed = AdminUpdateFeed.parse({ id: "feed_1", last_export_at: "2026-10-01T10:00:00.000Z" })

    expect(parsed.last_export_at).toEqual(new Date("2026-10-01T10:00:00.000Z"))
  })

  it("requires the feed id", () => {
    expect(AdminUpdateFeed.safeParse({ title: "Yandex" }).success).toBe(false)
  })

  it.each([
    ["without a name", { id: "pcat_shoes" }],
    ["without an id", { value: "Shoes" }],
    ["with a numeric parent id", { id: "pcat_boots", parentId: 1, value: "Boots" }],
  ])("rejects a category %s", (_, category) => {
    const result = AdminUpdateFeed.safeParse({ id: "feed_1", settings: { categories: [category] } })

    expect(result.success).toBe(false)
  })

  it.each([
    ["schedule", "30"],
    ["is_active", "yes"],
    ["last_export_at", "not a date"],
  ])("rejects an invalid %s", (field, value) => {
    expect(AdminUpdateFeed.safeParse({ id: "feed_1", [field]: value }).success).toBe(false)
  })
})

describe("query config", () => {
  it("leaves the settings out of the feed list and returns them with a single feed", () => {
    expect(listQueryConfig.listTransformQueryConfig.defaults).not.toContain("settings")
    expect(detailQueryConfig.retrieveTransformQueryConfig.defaults).toContain("settings")
  })

  it("lists 20 feeds per page", () => {
    expect(listQueryConfig.listTransformQueryConfig).toMatchObject({ defaultLimit: 20, isList: true })
    expect(detailQueryConfig.retrieveTransformQueryConfig.isList).toBe(false)
  })
})
