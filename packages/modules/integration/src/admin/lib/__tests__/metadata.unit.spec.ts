import { hasUneditableRows, metadataRows, parseMetadataRows } from "../metadata"

describe("metadataRows", () => {
  it("gives empty or missing metadata one blank row", () => {
    expect(metadataRows(null)).toEqual([{ key: "", value: "", disabled: false }])
    expect(metadataRows(undefined)).toEqual([{ key: "", value: "", disabled: false }])
    expect(metadataRows({})).toEqual([{ key: "", value: "", disabled: false }])
  })

  it("turns numbers and booleans into text and locks objects, arrays and null", () => {
    expect(metadataRows({ erp_id: "42", retries: 3, live: false, map: { a: 1 }, tags: ["x"], gone: null })).toEqual([
      { key: "erp_id", value: "42" },
      { key: "retries", value: "3" },
      { key: "live", value: "false" },
      { key: "map", value: { a: 1 }, disabled: true },
      { key: "tags", value: ["x"], disabled: true },
      { key: "gone", value: null, disabled: true },
    ])
  })
})

describe("hasUneditableRows", () => {
  it("is true only when some value is not a string, a number or a boolean", () => {
    expect(hasUneditableRows(null)).toBe(false)
    expect(hasUneditableRows({ a: "1", b: 2, c: true })).toBe(false)
    expect(hasUneditableRows({ a: "1", b: [1] })).toBe(true)
    expect(hasUneditableRows({ a: { b: 1 } })).toBe(true)
  })
})

describe("parseMetadataRows", () => {
  it("sends null for a form left with one blank row, which clears the metadata", () => {
    expect(parseMetadataRows([{ key: "", value: "" }], { erp_id: "42" })).toBeNull()
    expect(parseMetadataRows([], null)).toBeNull()
  })

  it("parses booleans and numbers and keeps everything else as trimmed text", () => {
    expect(
      parseMetadataRows(
        [
          { key: " erp_id ", value: " 42 " },
          { key: "ratio", value: "-0.5" },
          { key: "live", value: "true" },
          { key: "off", value: "false" },
          { key: "code", value: "007a" },
        ],
        null
      )
    ).toEqual({ erp_id: 42, ratio: -0.5, live: true, off: false, code: "007a" })
  })

  it("sends a removed or renamed key as an empty string, so the merge on the server drops it", () => {
    expect(parseMetadataRows([{ key: "owner", value: "ops" }], { note: "x", owner: "dev" })).toEqual({
      note: "",
      owner: "ops",
    })
  })

  it("sends a locked row back unchanged and skips rows without a key", () => {
    const tags = ["a", "b"]
    expect(
      parseMetadataRows(
        [
          { key: "tags", value: tags, disabled: true },
          { key: "", value: "orphan" },
        ],
        { tags }
      )
    ).toEqual({ tags })
  })
})
