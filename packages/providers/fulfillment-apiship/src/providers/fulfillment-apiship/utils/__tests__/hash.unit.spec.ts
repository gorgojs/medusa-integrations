import { hashObject } from "../hash"

describe("hashObject", () => {
  it("returns a 64-character hex string", () => {
    const hash = hashObject({ a: 1 })

    expect(typeof hash).toBe("string")
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it("returns the same hash for identical objects", () => {
    const obj = { b: 2, a: 1, c: [3, 4] }
    expect(hashObject(obj)).toBe(hashObject(obj))
  })

  it("returns different hashes for different objects", () => {
    expect(hashObject({ a: 1 })).not.toBe(hashObject({ a: 2 }))
  })

  it("is key-order independent — different key ordering yields the same hash", () => {
    const a = { z: "last", a: "first", m: "middle" }
    const b = { m: "middle", z: "last", a: "first" }
    expect(hashObject(a)).toBe(hashObject(b))
  })

  it("handles nested objects and sorts their keys too", () => {
    const a = { outer: { z: 1, a: 2 } }
    const b = { outer: { a: 2, z: 1 } }
    expect(hashObject(a)).toBe(hashObject(b))
  })

  it("maintains array order (different order = different hash)", () => {
    expect(hashObject({ list: [1, 2, 3] })).not.toBe(hashObject({ list: [3, 2, 1] }))
  })

  it("handles arrays of objects", () => {
    const a = { items: [{ z: 1, a: 2 }] }
    const b = { items: [{ a: 2, z: 1 }] }
    expect(hashObject(a)).toBe(hashObject(b))
  })

  it("handles primitive values", () => {
    expect(hashObject("string")).toBe(hashObject("string"))
    expect(hashObject(42)).toBe(hashObject(42))
    expect(hashObject(null)).toBe(hashObject(null))
  })

  it("handles empty objects and arrays", () => {
    expect(hashObject({})).toBe(hashObject({}))
    expect(hashObject([])).toBe(hashObject([]))
    expect(hashObject({})).not.toBe(hashObject([]))
  })
})
