import { describe, expect, it } from "@jest/globals"
import { badgesThatFit } from "../badges-fit"

describe("badgesThatFit", () => {
  it("shows every badge when they all fit, with no room kept for +N", () => {
    expect(badgesThatFit([50, 50, 50], 20, 158, 4)).toBe(3)
  })

  it("keeps room for +N when some are left out", () => {
    // Two badges take 104, and +N after them 24 more: 128 fits, a third badge would not.
    expect(badgesThatFit([50, 50, 50], 20, 140, 4)).toBe(2)
    expect(badgesThatFit([50, 50, 50], 20, 127, 4)).toBe(1)
  })

  it("shows one badge even when it does not fit, to be cut with an ellipsis", () => {
    expect(badgesThatFit([300, 50], 20, 100, 4)).toBe(1)
    expect(badgesThatFit([300], 20, 100, 4)).toBe(1)
  })
})
