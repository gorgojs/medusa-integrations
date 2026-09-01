import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import {
  INTEGRATION_LICENSE_STATE_KEY,
  INTEGRATION_PACKAGE_META_KEY,
  IntegrationProviderRegistrationPrefix as PREFIX,
} from "../../types"

const track = jest.fn()
jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track }),
}))

type ReportLicenseFn = (input: Record<string, unknown>) => boolean
const reportLicense = jest.fn<ReportLicenseFn>(() => true)
type LicenseStateFn = (packageName: string) => { state: string } | undefined
const licenseState = jest.fn<LicenseStateFn>(() => ({ state: "ok" }))

type Descriptor = { identifier: string }
type Meta = { name: string | null; license?: "required" | "optional" | null }

function makeContainer(
  descriptors: Record<string, Descriptor>,
  packageMeta: Record<string, Meta>,
  backendUrl?: string,
) {
  const registrations: Record<string, unknown> = {}
  for (const key of Object.keys(descriptors)) registrations[key] = true
  registrations.somethingElse = true
  const registered: Record<string, unknown> = {}

  return {
    registrations,
    registered,
    register(entry: Record<string, { resolve?: unknown }>) {
      for (const [key, value] of Object.entries(entry)) {
        const resolver = (value as any)?.resolve
        registered[key] = typeof resolver === "function" ? resolver() : value
      }
    },
    resolve(key: string) {
      if (key === INTEGRATION_PACKAGE_META_KEY) return packageMeta
      if (key === "configModule") return { admin: { backendUrl } }
      if (descriptors[key])
        return {
          descriptor: descriptors[key],
          getIdentifier: () => descriptors[key].identifier,
        }
      throw new Error(`not registered: ${key}`)
    },
  }
}

async function run(container: unknown, options: Record<string, unknown> = {}) {
  const loader = require("../check-licenses").default as (
    args: { container: unknown; options: Record<string, unknown> },
  ) => Promise<void>
  await loader({ container, options })
}

describe("checkLicenses loader", () => {
  beforeEach(() => {
    jest.resetModules()
    require("../license-state").resetLicenseStateStoreForTests()
    track.mockClear()
    reportLicense.mockClear()
    delete process.env.GORGO_LICENSE
    licenseState.mockClear()
    licenseState.mockImplementation(() => ({ state: "ok" }))
    jest.doMock("@gorgo-store/license", () => ({ reportLicense, licenseState }), {
      virtual: true,
    })
  })

  it("does nothing when the verifier package is not installed", async () => {
    jest.dontMock("@gorgo-store/license")
    jest.doMock("@gorgo-store/license", () => {
      throw new Error("Cannot find module")
    }, { virtual: true })

    const container = makeContainer(
      { [`${PREFIX}a`]: { identifier: "a" } },
      { a: { name: "@gorgo-store/a", license: "required" } },
    )
    await expect(run(container)).resolves.toBeUndefined()
    expect(reportLicense).not.toHaveBeenCalled()
  })

  it("skips a package that does not declare gorgo.license", async () => {
    const container = makeContainer(
      {
        [`${PREFIX}free`]: { identifier: "free" },
        [`${PREFIX}paid`]: { identifier: "paid" },
      },
      {
        free: { name: "@gorgo/free" },
        paid: { name: "@gorgo-store/paid", license: "required" },
      },
    )
    await run(container)
    expect(reportLicense).toHaveBeenCalledTimes(1)
    expect(reportLicense.mock.calls[0]?.[0]).toMatchObject({
      packageName: "@gorgo-store/paid",
    })
  })

  it("checks a package once even with several provider instances", async () => {
    const container = makeContainer(
      {
        [`${PREFIX}p_one`]: { identifier: "p" },
        [`${PREFIX}p_two`]: { identifier: "p" },
      },
      { p: { name: "@gorgo-store/p", license: "required" } },
    )
    await run(container)
    expect(reportLicense).toHaveBeenCalledTimes(1)
  })

  it("prefers options.license over GORGO_LICENSE", async () => {
    process.env.GORGO_LICENSE = "from-env"
    const container = makeContainer(
      { [`${PREFIX}p`]: { identifier: "p" } },
      { p: { name: "@gorgo-store/p", license: "required" } },
      "https://shop.example.com",
    )
    await run(container, { license: "from-options" })
    expect(reportLicense.mock.calls[0]?.[0]).toMatchObject({
      license: "from-options",
      backendUrl: "https://shop.example.com",
    })
  })

  it("falls back to GORGO_LICENSE", async () => {
    process.env.GORGO_LICENSE = "from-env"
    const container = makeContainer(
      { [`${PREFIX}p`]: { identifier: "p" } },
      { p: { name: "@gorgo-store/p", license: "required" } },
    )
    await run(container)
    expect(reportLicense.mock.calls[0]?.[0]).toMatchObject({ license: "from-env" })
  })

  it("skips a provider whose package name cannot be resolved", async () => {
    const container = makeContainer(
      { [`${PREFIX}p`]: { identifier: "p" } },
      { p: { name: null, license: "required" } },
    )
    await run(container)
    expect(reportLicense).not.toHaveBeenCalled()
  })

  it("keeps going when the verifier throws", async () => {
    reportLicense.mockImplementationOnce(() => {
      throw new Error("boom")
    })
    const container = makeContainer(
      {
        [`${PREFIX}a`]: { identifier: "a" },
        [`${PREFIX}b`]: { identifier: "b" },
      },
      {
        a: { name: "@gorgo-store/a", license: "required" },
        b: { name: "@gorgo-store/b", license: "required" },
      },
    )
    await expect(run(container)).resolves.toBeUndefined()
    expect(reportLicense).toHaveBeenCalledTimes(2)
  })

  it("registers the verdict per package for the admin surface", async () => {
    licenseState.mockImplementation(() => ({ state: "stale" }))
    const container = makeContainer(
      {
        [`${PREFIX}p_one`]: { identifier: "p" },
        [`${PREFIX}p_two`]: { identifier: "q" },
      },
      {
        p: { name: "@gorgo-store/p", license: "required" },
        q: { name: "@gorgo-store/p", license: "required" },
      },
    )
    await run(container)

    const state = (container as any).registered[INTEGRATION_LICENSE_STATE_KEY]
    expect(state["@gorgo-store/p"]).toMatchObject({
      package: "@gorgo-store/p",
      state: "stale",
    })
    expect(state["@gorgo-store/p"].identifiers.sort()).toEqual(["p", "q"])
  })

  it("marks a package undetermined when the verifier has no verdict", async () => {
    licenseState.mockImplementation(() => undefined)
    const container = makeContainer(
      { [`${PREFIX}p`]: { identifier: "p" } },
      { p: { name: "@gorgo-store/p", license: "required" } },
    )
    await run(container)

    const state = (container as any).registered[INTEGRATION_LICENSE_STATE_KEY]
    expect(state["@gorgo-store/p"].state).toBe("undetermined")
  })

  it("does not check a package that only declares gorgo.license optional", async () => {
    const container = makeContainer(
      { [`${PREFIX}p`]: { identifier: "p" } },
      { p: { name: "@gorgo-store/p", license: "optional" } },
    )
    await run(container)
    expect(reportLicense).not.toHaveBeenCalled()
  })
})
