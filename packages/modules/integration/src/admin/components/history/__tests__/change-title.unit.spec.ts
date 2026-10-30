import { describe, expect, it } from "@jest/globals"
import { changeTitle, isFailedChange } from "../change-title"

describe("changeTitle", () => {
  it("names the edited section when it still exists", () => {
    expect(changeTitle({ change_type: "updated", outcome: "succeeded" }, "Connection")).toEqual({
      key: "integration.history.events.updatedSection",
      values: { section: "Connection" },
    })
  })

  it("falls back to a title without a section", () => {
    expect(changeTitle({ change_type: "updated", outcome: "succeeded" }, null)).toEqual({
      key: "integration.history.events.updated",
    })
  })

  it("tells a passed connection test from a failed one", () => {
    expect(changeTitle({ change_type: "connection_tested", outcome: "succeeded" }).key).toBe(
      "integration.history.events.testPassed"
    )
    expect(changeTitle({ change_type: "connection_tested", outcome: "failed" }).key).toBe(
      "integration.history.events.testFailed"
    )
  })

  it("has a key for every other change type and for an unknown one", () => {
    for (const type of ["created", "enabled", "disabled", "deleted"] as const) {
      expect(changeTitle({ change_type: type, outcome: "succeeded" }).key).toBe(`integration.history.events.${type}`)
    }
    expect(changeTitle({ change_type: "reverted" as any, outcome: "succeeded" }).key).toBe(
      "integration.history.events.other"
    )
  })

  it("marks only failed changes", () => {
    expect(isFailedChange({ outcome: "failed" })).toBe(true)
    expect(isFailedChange({ outcome: "succeeded" })).toBe(false)
  })
})
