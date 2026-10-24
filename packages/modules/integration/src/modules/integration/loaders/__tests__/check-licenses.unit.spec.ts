import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
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
const logger = { warn: jest.fn(), info: jest.fn() }

type Meta = {
  name: string | null
  version?: string | null
  license?: "required" | "optional" | null
  dir?: string
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

function licenseState() {
  return require("../license-state") as typeof import("../license-state")
}

function onChange(): AnyFn {
  return (configureLicense.mock.calls[0]![0] as { onChange: AnyFn }).onChange
}

describe("checkLicenses loader", () => {
  beforeEach(() => {
    jest.resetModules()
    for (const fn of [track, configureLicense, registerLicensedPackage, licenseStates, recheckLicense]) fn.mockClear()
    jest.doMock(
      "@gorgo-store/license",
      () => ({ configureLicense, registerLicensedPackage, licenseStates, recheckLicense }),
      { virtual: true },
    )
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

  it("configures the copy it sees itself for packages that register on their own", async () => {
    await run(makeContainer({}, {}))
    expect(configureLicense).toHaveBeenCalledTimes(1)
    expect(registerLicensedPackage).not.toHaveBeenCalled()
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

  it("finds the library through the paid package that depends on it", async () => {
    jest.dontMock("@gorgo-store/license")
    const root = mkdtempSync(path.join(tmpdir(), "gorgo-project-"))
    const paid = path.join(root, "node_modules", "@gorgo-store", "medusa-erp-1c")
    const lib = path.join(root, "node_modules", "@gorgo-store", "license")
    mkdirSync(paid, { recursive: true })
    mkdirSync(lib, { recursive: true })
    writeFileSync(path.join(lib, "package.json"), JSON.stringify({ name: "@gorgo-store/license", main: "index.js" }))
    writeFileSync(
      path.join(lib, "index.js"),
      `const calls = (globalThis.__gorgoLicenseCalls = [])
      module.exports = {
        configureLicense: (input) => calls.push(["configure", input.license]),
        registerLicensedPackage: (input) => (calls.push(["register", input.packageName]), input.packageName),
        licenseStates: () => ({}),
        recheckLicense: async () => undefined,
      }`,
    )

    await run(makeContainer({ [`${PREFIX}onec`]: "onec" }, { onec: { name: PAID, license: "required", dir: paid } }), {
      license: "gorgo_live_key",
    })

    expect((globalThis as any).__gorgoLicenseCalls).toEqual([
      ["configure", "gorgo_live_key"],
      ["register", PAID],
    ])
  })

  it("does nothing when the library is missing or predates registerLicensedPackage", async () => {
    jest.dontMock("@gorgo-store/license")
    jest.doMock("@gorgo-store/license", () => ({ reportLicense: jest.fn() }), { virtual: true })

    await expect(
      run(makeContainer({ [`${PREFIX}onec`]: "onec" }, { onec: { name: PAID, license: "required" } })),
    ).resolves.toBeUndefined()
    expect(licenseState().licenseStates()).toEqual([])
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

describe("license states", () => {
  beforeEach(() => {
    jest.resetModules()
    for (const fn of [configureLicense, registerLicensedPackage, licenseStates, recheckLicense]) fn.mockClear()
    jest.doMock(
      "@gorgo-store/license",
      () => ({ configureLicense, registerLicensedPackage, licenseStates, recheckLicense }),
      { virtual: true },
    )
  })

  it("lists every package the library checks, with the providers each one ships", async () => {
    licenseStates.mockReturnValue({
      [PAID]: {
        state: "ok",
        checkedAt: Date.UTC(2026, 9, 24, 10),
        project: { handle: "shop", name: "Shop" },
        environment: null,
        subscription: { ends_at: "2027-01-01T00:00:00.000Z", cutoff: null },
        latestAllowedVersion: null,
      },
      "@gorgo-store/medusa-payment-tkassa": { state: "failed", reason: "no_subscription" },
    })
    await run(
      makeContainer(
        { [`${PREFIX}onec`]: "onec", [`${PREFIX}onec_two`]: "onec_catalog" },
        { onec: { name: PAID, license: "required" }, onec_catalog: { name: PAID, license: "required" } },
      ),
    )

    expect(licenseState().licenseStates()).toEqual([
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
        package: "@gorgo-store/medusa-payment-tkassa",
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

  it("reads a state it does not know as pending", async () => {
    licenseStates.mockReturnValue({ [PAID]: { state: "grace" } })
    await run(makeContainer({ [`${PREFIX}onec`]: "onec" }, { onec: { name: PAID, license: "required" } }))
    expect(licenseState().licenseStates()[0]).toMatchObject({ package: PAID, state: "pending" })
  })

  it("rechecks through the library and returns the fresh states", async () => {
    licenseStates.mockReturnValueOnce({ [PAID]: { state: "failed", reason: "domain_not_allowed" } })
    licenseStates.mockReturnValue({ [PAID]: { state: "ok" } })
    await run(makeContainer({ [`${PREFIX}onec`]: "onec" }, { onec: { name: PAID, license: "required" } }))
    expect(licenseState().licenseStates()[0]).toMatchObject({ package: PAID, state: "failed" })

    const fresh = await licenseState().recheckLicenses()

    expect(recheckLicense).toHaveBeenCalledTimes(1)
    expect(fresh).toEqual([expect.objectContaining({ package: PAID, state: "ok" })])
  })

  it("is empty before the loader ran", async () => {
    expect(licenseState().licenseStates()).toEqual([])
    await expect(licenseState().recheckLicenses()).resolves.toEqual([])
  })
})
