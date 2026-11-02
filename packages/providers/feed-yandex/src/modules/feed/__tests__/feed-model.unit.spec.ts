jest.mock(
  "@gorgo/telemetry",
  () => ({ createTelemetryClient: () => ({ track: () => {} }) }),
  { virtual: true }
)

import { readFileSync } from "fs"
import { join } from "path"
import { FEED_MODULE } from ".."
import Feed from "../models/feed"

type SnapshotColumn = { name: string; nullable: boolean; default?: string }

const snapshot = JSON.parse(
  readFileSync(join(__dirname, "../migrations/.snapshot-medusa-feed.json"), "utf-8")
)
const table = snapshot.tables.find((t: { name: string }) => t.name === "feed")
const columns: Record<string, SnapshotColumn> = table.columns

const fields = Object.entries(Feed.parse().schema).map(([name, property]) =>
  (property as { parse: (name: string) => any }).parse(name)
)

describe("feed module", () => {
  it("registers under the feed key", () => {
    expect(FEED_MODULE).toBe("feed")
  })

  it("creates feeds inactive, exported every 30 minutes and without settings", () => {
    const byName = Object.fromEntries(fields.map((field) => [field.fieldName, field]))

    expect(byName.is_active.defaultValue).toBe(false)
    expect(byName.schedule.defaultValue).toBe(30)
    expect(byName.settings.nullable).toBe(true)
  })

  it("has a migration column for every model field and no other", () => {
    expect(Object.keys(columns).sort()).toEqual(fields.map((field) => field.fieldName).sort())
  })

  it.each(fields.map((field) => [field.fieldName, field]))(
    "keeps %s in step with the migration snapshot",
    (name, field) => {
      const column = columns[name]

      expect(column.nullable).toBe(field.nullable)
      if (field.defaultValue !== undefined) {
        expect(column.default).toBe(String(field.defaultValue))
      }
    }
  )
})
