import { describe, expect, it } from "@jest/globals"
import { changeTimeFormat } from "../format-date"

const NOW = Date.UTC(2026, 9, 30, 12)
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

describe("changeTimeFormat", () => {
  const en = changeTimeFormat("en", NOW)

  it("counts minutes, hours and days within a week", () => {
    expect(en.relative(ago(10))).toBe("now")
    expect(en.relative(ago(5 * 60))).toBe("5 min. ago")
    expect(en.relative(ago(3 * 3600))).toBe("3 hr. ago")
    expect(en.relative(ago(2 * 86400))).toBe("2 days ago")
  })

  it("shows the date after a week", () => {
    expect(en.relative(ago(10 * 86400))).toBe("Oct 20, 2026")
  })

  it("gives the full date with the time", () => {
    expect(en.full(new Date(NOW).toISOString())).toContain("October 30, 2026")
  })

  it("accepts Medusa's language names, which Intl rejects", () => {
    expect(changeTimeFormat("ptBR", NOW).relative(ago(10 * 86400))).toContain("2026")
    expect(changeTimeFormat("ru", NOW).relative(ago(5 * 60))).toBe("5 мин. назад")
  })
})
