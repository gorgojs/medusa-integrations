import { describe, expect, it } from "@jest/globals"
import { toLicenseStateEntries } from "../license-entry"

const PAID = "@gorgo-store/medusa-erp-1c"

const packageMeta = {
  onec: { name: PAID, version: "0.3.0", author: null, authorUrl: null, license: "required" as const },
  onec_catalog: { name: PAID, version: "0.3.0", author: null, authorUrl: null, license: "required" as const },
  yookassa: { name: "@gorgo/medusa-payment-yookassa", version: "1.0.0", author: null, authorUrl: null, license: null },
}

describe("toLicenseStateEntries", () => {
  it("puts each verdict in the admin API's shape, tied to the providers its package ships", () => {
    const entries = toLicenseStateEntries(
      {
        [PAID]: {
          state: "ok",
          checkedAt: Date.UTC(2026, 9, 24, 10),
          project: { handle: "shop", name: "Shop" },
          environment: null,
          subscription: { ends_at: "2027-01-01T00:00:00.000Z", cutoff: null },
          latestAllowedVersion: null,
        },
        "@gorgo-store/sandbox-medusa-payment": { state: "failed", reason: "no_subscription" },
      },
      packageMeta,
    )

    expect(entries).toEqual([
      {
        package: PAID,
        state: "ok",
        checked_at: "2026-10-24T10:00:00.000Z",
        project: { handle: "shop", name: "Shop" },
        environment: null,
        subscription: { ends_at: "2027-01-01T00:00:00.000Z", cutoff: null },
        latest_allowed_version: null,
        identifiers: ["onec", "onec_catalog"],
      },
      {
        package: "@gorgo-store/sandbox-medusa-payment",
        state: "failed",
        reason: "no_subscription",
        checked_at: null,
        project: null,
        subscription: null,
        latest_allowed_version: null,
        identifiers: [],
      },
    ])
  })

  it("reads a state it does not know as pending", () => {
    const [entry] = toLicenseStateEntries({ [PAID]: { state: "grace" } as never }, packageMeta)
    expect(entry).toMatchObject({ package: PAID, state: "pending" })
  })

  it("is empty while the library holds no verdict", () => {
    expect(toLicenseStateEntries({}, packageMeta)).toEqual([])
  })
})
