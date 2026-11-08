import { describe, expect, it } from "@jest/globals"
import type { IntegrationOverviewItem } from "../../../../types"
import {
  buildChangesQuery,
  emptyFilters,
  fieldsMatching,
  filtersFromState,
  hasFilters,
  isEmptyFilterValue,
  orderFromSorting,
  providersMatching,
  readFilters,
  readOffset,
  sortingFromOrder,
  writeFilters,
} from "../history-filters"

describe("history filters in the URL", () => {
  it("reads the filters and drops values it does not know", () => {
    const params = new URLSearchParams(
      "provider_id=int_x&change_type=updated&change_type=bogus&actor_id=user_1&actor_id=system&actor_id=&from=2026-10-01T00:00:00.000Z&to=nope&q=%20anna%20&order=-actor_label"
    )
    expect(readFilters(params)).toEqual({
      provider_id: ["int_x"],
      change_type: ["updated"],
      actor_id: ["user_1", "system"],
      created_at: { $gte: "2026-10-01T00:00:00.000Z" },
      q: " anna ",
      order: "-actor_label",
    })
  })

  it("reads an empty URL as no filters, newest first", () => {
    expect(readFilters(new URLSearchParams())).toEqual({
      provider_id: [],
      change_type: [],
      actor_id: [],
      created_at: null,
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
      actor_id: ["user_1", "system"],
      created_at: { $gte: "2026-10-01T00:00:00.000Z", $lte: "2026-10-05T00:00:00.000Z" },
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
    expect(hasFilters(readFilters(new URLSearchParams("actor_id=system")))).toBe(true)
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

  it("sends the options and integrations the search matched, and only with the search", () => {
    const matches = { fields: ["demo.apiKey"], providers: ["pp_demo_demo"] }
    const query = buildChangesQuery(readFilters(new URLSearchParams("q=key")), 0, matches)
    expect(query).toMatchObject({ q: "key", q_fields: ["demo.apiKey"], q_providers: ["pp_demo_demo"] })
    const noSearch = buildChangesQuery(readFilters(new URLSearchParams()), 0, matches)
    expect(noSearch).not.toHaveProperty("q_fields")
    expect(noSearch).not.toHaveProperty("q_providers")
    const nothingMatched = buildChangesQuery(readFilters(new URLSearchParams("q=key")), 0, { fields: [], providers: [] })
    expect(nothingMatched).not.toHaveProperty("q_fields")
    expect(nothingMatched).not.toHaveProperty("q_providers")
  })

  it("sends the authors, System among them", () => {
    expect(buildChangesQuery(readFilters(new URLSearchParams("actor_id=user_1&actor_id=system")), 0)).toEqual({
      limit: 20,
      offset: 0,
      actor_id: ["user_1", "system"],
    })
  })

  it("makes the end of the period the end of that day", () => {
    const to = new Date(2026, 9, 5).toISOString()
    const query = buildChangesQuery(readFilters(new URLSearchParams({ to })), 20)
    expect(query.offset).toBe(20)
    expect(query.created_at?.$lte).toBe(new Date(2026, 9, 5, 23, 59, 59, 999).toISOString())
  })
})

describe("sorting", () => {
  it("is newest first without an order", () => {
    expect(sortingFromOrder("")).toEqual({ id: "created_at", desc: true })
    expect(orderFromSorting({ id: "created_at", desc: true })).toBe("")
  })

  it("round-trips a column and a direction", () => {
    expect(sortingFromOrder("-actor_label")).toEqual({ id: "actor_label", desc: true })
    expect(orderFromSorting({ id: "actor_label", desc: true })).toBe("-actor_label")
    expect(orderFromSorting({ id: "created_at", desc: false })).toBe("created_at")
  })
})

describe("filters picked from the table menu", () => {
  // The menu adds a filter with an empty value and keeps its picker open while it stays empty.
  const state = { provider_id: [], change_type: ["updated"], actor_id: ["user_1"], created_at: null }

  it("tells an empty filter from one with a value", () => {
    expect(isEmptyFilterValue([])).toBe(true)
    expect(isEmptyFilterValue(null)).toBe(true)
    expect(isEmptyFilterValue({})).toBe(true)
    expect(isEmptyFilterValue({ $gte: undefined })).toBe(true)
    expect(isEmptyFilterValue(["int_x"])).toBe(false)
    expect(isEmptyFilterValue({ $gte: "2026-10-01T00:00:00.000Z" })).toBe(false)
  })

  it("keeps the empty ones aside, so the URL gets only filters with a value", () => {
    expect(emptyFilters(state)).toEqual({ provider_id: [], created_at: null })
    expect(filtersFromState(state)).toEqual({
      provider_id: [],
      change_type: ["updated"],
      actor_id: ["user_1"],
      created_at: null,
    })
  })

  it("reads a date range from the table state", () => {
    expect(filtersFromState({ created_at: { $gte: "2026-10-01T00:00:00.000Z" } })).toEqual({
      provider_id: [],
      change_type: [],
      actor_id: [],
      created_at: { $gte: "2026-10-01T00:00:00.000Z" },
    })
  })
})

describe("fieldsMatching", () => {
  const fields = [
    { field: "terminalKey", label: "tkassa.terminalKey" },
    { field: "apiKey", label: "yookassa.apiKey" },
    { field: "webhookUrl", label: null },
    { field: "@title", label: null },
  ]
  // As the table labels them: a translation for the label keys, the id otherwise.
  const shown: Record<string, string> = {
    "tkassa.terminalKey": "Ключ терминала",
    "yookassa.apiKey": "Секретный ключ",
    "@title": "Название",
  }
  const labelOf = (field: { field: string; label: string | null }) =>
    shown[field.label ?? field.field] ?? field.field

  it("matches the label as shown, case-insensitively, and sends its key", () => {
    expect(fieldsMatching(" КЛЮЧ ", fields, labelOf)).toEqual(["tkassa.terminalKey", "yookassa.apiKey"])
    expect(fieldsMatching("назв", fields, labelOf)).toEqual(["@title"])
  })

  it("matches the option id too, and sends the id of an option stored without a label", () => {
    expect(fieldsMatching("terminalkey", fields, labelOf)).toEqual(["tkassa.terminalKey"])
    expect(fieldsMatching("webhook", fields, labelOf)).toEqual(["webhookUrl"])
  })

  it("matches nothing for an empty search or an unknown word", () => {
    expect(fieldsMatching(" ", fields, labelOf)).toEqual([])
    expect(fieldsMatching("price", fields, labelOf)).toEqual([])
  })
})

describe("providersMatching", () => {
  const item = (provider_id: string, display_name: string) =>
    ({ provider_id, display_name, identifier: provider_id.split("_")[1] }) as IntegrationOverviewItem
  const integrations = [item("pp_yookassa_yookassa", "yookassa.name"), item("pp_tkassa_tkassa", "tkassa.name")]
  const shown: Record<string, string> = { "yookassa.name": "ЮKassa", "tkassa.name": "Т-Касса" }
  const nameOf = (i: IntegrationOverviewItem) => shown[i.display_name] ?? i.display_name

  it("matches the name as shown, case-insensitively, and sends the provider_id", () => {
    expect(providersMatching(" юk ", integrations, nameOf)).toEqual(["pp_yookassa_yookassa"])
    expect(providersMatching("касса", integrations, nameOf)).toEqual(["pp_tkassa_tkassa"])
  })

  it("matches neither the translation key nor anything for an empty search", () => {
    expect(providersMatching("name", integrations, nameOf)).toEqual([])
    expect(providersMatching(" ", integrations, nameOf)).toEqual([])
  })
})
