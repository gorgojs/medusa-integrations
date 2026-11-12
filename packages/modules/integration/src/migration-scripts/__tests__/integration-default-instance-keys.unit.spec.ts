import { describe, expect, it } from "@jest/globals"
import { planLegacyKeyMoves } from "../integration-default-instance-keys"

const reg = (identifier: string, instanceId: string, configured = false) => ({
  provider_id: `int_${identifier}_${instanceId}`,
  identifier,
  instance_id: instanceId,
  is_configured: configured,
})

describe("planLegacyKeyMoves", () => {
  it("moves the key of a registration without an id to its default instance", () => {
    expect(planLegacyKeyMoves([reg("stripe", "default")])).toEqual([
      { from: "int_stripe", to: "int_stripe_default" },
    ])
  })

  it("plans a move for every registration without an id", () => {
    expect(planLegacyKeyMoves([reg("stripe", "default"), reg("yookassa", "default")])).toEqual([
      { from: "int_stripe", to: "int_stripe_default" },
      { from: "int_yookassa", to: "int_yookassa_default" },
    ])
  })

  it("leaves a provider alone when its default instance already has settings", () => {
    expect(planLegacyKeyMoves([reg("stripe", "default", true)])).toEqual([])
  })

  it("does not move anything into a named instance", () => {
    // `int_stripe` belonged to a registration without an id. If the config now names the instance,
    // the old settings may be another account's, and only the merchant can tell.
    expect(planLegacyKeyMoves([reg("stripe", "eu")])).toEqual([])
  })

  it("leaves a key that a registration still uses", () => {
    // The old key of `my_crm` is `int_my_crm`, which is also the key of the instance `crm` of `my`.
    // That registration still reads it, so it is not a key from before 2.0.
    expect(planLegacyKeyMoves([reg("my_crm", "default"), reg("my", "crm")])).toEqual([])
  })
})
