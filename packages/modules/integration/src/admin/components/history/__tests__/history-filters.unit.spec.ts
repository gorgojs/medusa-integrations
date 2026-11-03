import { describe, expect, it } from "@jest/globals"
import {
  buildChangesQuery,
  emptyFilters,
  filtersFromState,
  hasFilters,
  isEmptyFilterValue,
  orderFromSorting,
  readFilters,
  readOffset,
  sortingFromOrder,
  writeFilters,
} from "../history-filters"

describe("history filters in the URL", () => {
  it("reads the filters and drops values it does not know", () => {
    const params = new URLSearchParams(
      "provider_id=int_x&change_type=updated&change_type=bogus&from=2026-10-01T00:00:00.000Z&to=nope&q=%20anna%20&order=-actor_label"
    )
    expect(readFilters(params)).toEqual({
      provider_id: ["int_x"],
      change_type: ["updated"],
      occurred_at: { $gte: "2026-10-01T00:00:00.000Z" },
      q: " anna ",
      order: "-actor_label",
    })
  })

  it("reads an empty URL as no filters, newest first", () => {
    expect(readFilters(new URLSearchParams())).toEqual({
      provider_id: [],
      change_type: [],
      occurred_at: null,
      q: "",
      order: "",
    })
  })

  it("ignores a column it cannot sort by", () => {
    expect(readFilters(new URLSearchParams("order=-diff")).order).toBe("")
  })

  it("round-trips through writeFilters and keeps the open change card", () => {
    const filters = {
      provider_id: ["int_a", "int_b"],
      change_type: ["deleted"],
      occurred_at: { $gte: "2026-10-01T00:00:00.000Z", $lte: "2026-10-05T00:00:00.000Z" },
      q: "tkassa",
      order: "provider_id",
    }
    const written = writeFilters(new URLSearchParams("change=intch_1&offset=40"), filters, 20)
    expect(written.get("change")).toBe("intch_1")
    expect(written.get("offset")).toBe("20")
    expect(readFilters(written)).toEqual(filters)
  })

  it("drops the offset when it is 0", () => {
    expect(writeFilters(new URLSearchParams("offset=40"), readFilters(new URLSearchParams())).has("offset")).toBe(false)
  })

  it("ignores a bad offset", () => {
    expect(readOffset(new URLSearchParams("offset=-3"))).toBe(0)
    expect(readOffset(new URLSearchParams("offset=abc"))).toBe(0)
    expect(readOffset(new URLSearchParams("offset=40"))).toBe(40)
  })

  it("counts a search as a filter and the sorting as none", () => {
    expect(hasFilters(readFilters(new URLSearchParams("q=anna")))).toBe(true)
    expect(hasFilters(readFilters(new URLSearchParams("q=%20")))).toBe(false)
    expect(hasFilters(readFilters(new URLSearchParams("order=provider_id")))).toBe(false)
  })
})

describe("buildChangesQuery", () => {
  it("sends only the filters that are set", () => {
    expect(buildChangesQuery(readFilters(new URLSearchParams()), 0)).toEqual({ limit: 20, offset: 0 })
  })

  it("passes the search, trimmed, and the sorting on", () => {
    expect(buildChangesQuery(readFilters(new URLSearchParams("q=%20anna%20&order=change_type")), 0)).toEqual({
      limit: 20,
      offset: 0,
      q: "anna",
      order: "change_type",
    })
  })

  it("makes the end of the period the end of that day", () => {
    const to = new Date(2026, 9, 5).toISOString()
    const query = buildChangesQuery(readFilters(new URLSearchParams({ to })), 20)
    expect(query.offset).toBe(20)
    expect(query.occurred_at?.$lte).toBe(new Date(2026, 9, 5, 23, 59, 59, 999).toISOString())
  })
})

describe("sorting", () => {
  it("is newest first without an order", () => {
    expect(sortingFromOrder("")).toEqual({ id: "occurred_at", desc: true })
    expect(orderFromSorting({ id: "occurred_at", desc: true })).toBe("")
  })

  it("round-trips a column and a direction", () => {
    expect(sortingFromOrder("-actor_label")).toEqual({ id: "actor_label", desc: true })
    expect(orderFromSorting({ id: "actor_label", desc: true })).toBe("-actor_label")
    expect(orderFromSorting({ id: "occurred_at", desc: false })).toBe("occurred_at")
  })
})

describe("filters picked from the table menu", () => {
  // The menu adds a filter with an empty value and keeps its picker open while it stays empty.
  const state = { provider_id: [], change_type: ["updated"], occurred_at: null }

  it("tells an empty filter from one with a value", () => {
    expect(isEmptyFilterValue([])).toBe(true)
    expect(isEmptyFilterValue(null)).toBe(true)
    expect(isEmptyFilterValue({})).toBe(true)
    expect(isEmptyFilterValue({ $gte: undefined })).toBe(true)
    expect(isEmptyFilterValue(["int_x"])).toBe(false)
    expect(isEmptyFilterValue({ $gte: "2026-10-01T00:00:00.000Z" })).toBe(false)
  })

  it("keeps the empty ones aside, so the URL gets only filters with a value", () => {
    expect(emptyFilters(state)).toEqual({ provider_id: [], occurred_at: null })
    expect(filtersFromState(state)).toEqual({
      provider_id: [],
      change_type: ["updated"],
      occurred_at: null,
    })
  })

  it("reads a date range from the table state", () => {
    expect(filtersFromState({ occurred_at: { $gte: "2026-10-01T00:00:00.000Z" } })).toEqual({
      provider_id: [],
      change_type: [],
      occurred_at: { $gte: "2026-10-01T00:00:00.000Z" },
    })
  })
})
