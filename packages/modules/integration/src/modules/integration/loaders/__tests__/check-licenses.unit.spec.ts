import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"
import { INTEGRATION_PACKAGE_META_KEY, IntegrationProviderRegistrationPrefix as PREFIX } from "../../types"

const track = jest.fn()
jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track }),
}))

type AnyFn = (...args: any[]) => any
const configureLicense = jest.fn<AnyFn>()
const registerLicensedPackage = jest.fn<AnyFn>((input: { packageName?: string }) => input.packageName)
const licenseStates = jest.fn<AnyFn>(() => ({}))
const recheckLicense = jest.fn<AnyFn>(async () => undefined)

const PAID = "@gorgo-store/medusa-erp-1c"
const TOKEN = "gorgo_live_" + "ab".repeat(24)
const logger = { warn: jest.fn(), info: jest.fn() }

type Meta = {
  name: string | null
  version?: string | null
  license?: "required" | "optional" | null
}

function makeContainer(identifiers: Record<string, string>, packageMeta: Record<string, Meta>) {
  const registrations: Record<string, unknown> = { somethingElse: true }
  for (const key of Object.keys(identifiers)) registrations[key] = true

  return {
    registrations,
    resolve(key: string) {
      if (key === INTEGRATION_PACKAGE_META_KEY) return packageMeta
      if (key === "configModule") {
        return { admin: { backendUrl: "https://api.shop.example.com" }, projectConfig: { workerMode: "server" } }
      }
      if (key === "logger") return logger
      if (identifiers[key]) return { getIdentifier: () => identifiers[key] }
      throw new Error(`not registered: ${key}`)
    },
  }
}

async function run(container: unknown, options: Record<string, unknown> = {}) {
  const loader = require("../check-licenses").default as (args: {
    container: unknown
    options: Record<string, unknown>
  }) => Promise<void>
  await loader({ container, options })
}

function onChange(): AnyFn {
  return (configureLicense.mock.calls[0]![0] as { onChange: AnyFn }).onChange
}

describe("checkLicenses loader", () => {
  beforeEach(() => {
    jest.resetModules()
    for (const fn of [track, configureLicense, registerLicensedPackage, licenseStates, recheckLicense]) fn.mockClear()
    jest.doMock("@gorgo/license", () => ({ configureLicense, registerLicensedPackage, licenseStates, recheckLicense }))
  })

  it("registers every package that declares gorgo.license, once per package", async () => {
    const container = makeContainer(
      { [`${PREFIX}onec`]: "onec", [`${PREFIX}onec_two`]: "onec", [`${PREFIX}free`]: "free", [`${PREFIX}opt`]: "opt" },
      {
        onec: { name: PAID, version: "0.3.0", license: "required" },
        free: { name: "@gorgo/medusa-payment-yookassa", version: "1.0.0", license: null },
        opt: { name: "@gorgo-store/optional", version: "1.0.0", license: "optional" },
      },
    )
    await run(container)

    expect(registerLicensedPackage.mock.calls).toEqual([[{ packageName: PAID, packageVersion: "0.3.0" }]])
  })

  it("configures the check from the module options and the config module", async () => {
    await run(makeContainer({ [`${PREFIX}onec`]: "onec" }, { onec: { name: PAID, license: "required" } }), {
      license: "gorgo_live_from_options",
    })

    expect(configureLicense).toHaveBeenCalledWith(
      expect.objectContaining({
        license: "gorgo_live_from_options",
        backendUrl: "https://api.shop.example.com",
        workerMode: "server",
        logger,
      }),
    )
  })

  it("leaves the key to GORGO_LICENSE when the module options have none", async () => {
    await run(makeContainer({ [`${PREFIX}onec`]: "onec" }, { onec: { name: PAID, license: "required" } }))
    expect((configureLicense.mock.calls[0]![0] as { license?: string }).license).toBeUndefined()
  })

  it("configures the check even with no paid package, for providers that register on their own", async () => {
    await run(makeContainer({}, {}))
    expect(configureLicense).toHaveBeenCalledTimes(1)
    expect(registerLicensedPackage).not.toHaveBeenCalled()
  })

  it("configures the check once however many paid packages there are, so one listener reports", async () => {
    await run(
      makeContainer(
        { [`${PREFIX}onec`]: "onec", [`${PREFIX}other`]: "other" },
        {
          onec: { name: PAID, license: "required" },
          other: { name: "@gorgo-store/sandbox-medusa-payment-integration", license: "required" },
        },
      ),
    )
    expect(configureLicense).toHaveBeenCalledTimes(1)
    expect(registerLicensedPackage).toHaveBeenCalledTimes(2)
  })

  it("sends the verdicts of its own packages to telemetry without the key", async () => {
    await run(makeContainer({ [`${PREFIX}onec`]: "onec" }, { onec: { name: PAID, license: "required" } }), {
      license: "gorgo_live_secret",
    })

    onChange()(PAID, { state: "pending" })
    onChange()(PAID, { state: "ok" }, { state: "pending" })
    onChange()(PAID, { state: "failed", reason: "domain_not_allowed" }, { state: "ok" })
    onChange()(PAID, { state: "unreachable" }, { state: "failed" })
    onChange()("@gorgo-store/medusa-payment-tkassa", { state: "failed", reason: "no_subscription" })

    expect(track.mock.calls).toEqual([
      ["license.ok", { package: PAID }],
      ["license.failed", { package: PAID, reason: "domain_not_allowed" }],
      ["license.unreachable", { package: PAID }],
    ])
    expect(JSON.stringify(track.mock.calls)).not.toContain("gorgo_live_secret")
  })

  it("never fails the module when the library throws", async () => {
    registerLicensedPackage.mockImplementationOnce(() => {
      throw new Error("boom")
    })
    await expect(
      run(makeContainer({ [`${PREFIX}onec`]: "onec" }, { onec: { name: PAID, license: "required" } })),
    ).resolves.toBeUndefined()
  })
})

describe("with the real @gorgo/license", () => {
  let fetchMock: jest.Mock<AnyFn>

  beforeEach(() => {
    jest.resetModules()
    jest.dontMock("@gorgo/license")
    jest.useFakeTimers()
    process.env.GORGO_LICENSE = TOKEN
    fetchMock = jest.fn<AnyFn>(async (_url: unknown, init: { body: string }) => {
      const { packages } = JSON.parse(init.body) as { packages: { name: string }[] }
      return new Response(
        JSON.stringify({
          ok: true,
          project: { handle: "shop", name: "Shop" },
          environment: null,
          packages: packages.map(({ name }) => ({ name, ok: true, cutoff: null, ends_at: null, latest_allowed_version: null })),
        }),
      )
    })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    jest.useRealTimers()
    delete process.env.GORGO_LICENSE
  })

  it("does not reach the network when no package is paid, so stores with free plugins send nothing", async () => {
    await run(
      makeContainer(
        { [`${PREFIX}free`]: "free" },
        { free: { name: "@gorgo/medusa-payment-yookassa", version: "1.0.0", license: null } },
      ),
    )
    await jest.advanceTimersByTimeAsync(3_000)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("asks the platform once about the paid packages", async () => {
    await run(makeContainer({ [`${PREFIX}onec`]: "onec" }, { onec: { name: PAID, version: "0.3.0", license: "required" } }))
    await jest.advanceTimersByTimeAsync(3_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)
    expect(body.packages).toEqual([{ name: PAID, version: "0.3.0" }])
  })
})
