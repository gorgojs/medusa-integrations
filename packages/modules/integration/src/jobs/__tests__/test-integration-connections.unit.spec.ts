import { describe, expect, it } from "@jest/globals"
import { tallyOutcomes, formatConnectionTestSummary } from "../test-integration-connections"

describe("tallyOutcomes", () => {
  it("counts each status into its own bucket (statuses, not display labels)", () => {
    expect(tallyOutcomes(["passed", "failed", "passed", "skipped", "errored"])).toEqual({
      passed: 2,
      failed: 1,
      skipped: 1,
      errored: 1,
    })
  })

  it("returns all-zero buckets for no outcomes", () => {
    expect(tallyOutcomes([])).toEqual({ passed: 0, failed: 0, skipped: 0, errored: 0 })
  })
})

describe("formatConnectionTestSummary", () => {
  it("maps passed→ok and failed→fail in the summary line", () => {
    const line = formatConnectionTestSummary({ passed: 2, failed: 1, skipped: 3, errored: 0 })
    expect(line).toContain("ok: 2")
    expect(line).toContain("fail: 1")
    expect(line).toContain("skipped: 3")
    expect(line).toContain("errored: 0")
  })
})
