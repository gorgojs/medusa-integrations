import { describe, expect, it } from "@jest/globals"
import { changeTitle } from "../change-title"

const diff = (n: number) => Array.from({ length: n }, (_, i) => ({ field: `f${i}`, from: null, to: i })) as any

describe("changeTitle", () => {
  it("counts the options a first save set", () => {
    expect(changeTitle({ change_type: "created", diff: diff(1) })).toEqual({
      key: "integration.history.events.fieldsSet",
      values: { count: 1 },
    })
  })

  it("counts the changed options of an edit, whatever sections they are in", () => {
    expect(changeTitle({ change_type: "updated", diff: diff(2) })).toEqual({
      key: "integration.history.events.fieldsChanged",
      values: { count: 2 },
    })
  })

  it("counts the options a deletion removed, and has a plain title when there were none", () => {
    expect(changeTitle({ change_type: "deleted", diff: diff(3) })).toEqual({
      key: "integration.history.events.fieldsDeleted",
      values: { count: 3 },
    })
    expect(changeTitle({ change_type: "deleted", diff: [] }).key).toBe("integration.history.events.deleted")
  })

  it("names a toggle without a count", () => {
    expect(changeTitle({ change_type: "enabled", diff: [] }).key).toBe("integration.history.events.enabled")
    expect(changeTitle({ change_type: "disabled", diff: [] }).key).toBe("integration.history.events.disabled")
  })

  it("falls back for a save without options and for a type it does not know", () => {
    expect(changeTitle({ change_type: "updated", diff: [] }).key).toBe("integration.history.events.other")
    expect(changeTitle({ change_type: "reverted" as any, diff: diff(1) }).key).toBe("integration.history.events.other")
  })
})
