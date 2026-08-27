import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import {
  INTEGRATION_PACKAGE_META_KEY,
  IntegrationProviderRegistrationPrefix as PREFIX,
} from "../../types"

const track = jest.fn()
jest.mock("@gorgo/telemetry", () => ({
  createTelemetryClient: () => ({ track }),
}))

type ReportLicenseFn = (input: Record<string, unknown>) => boolean
const reportLicense = jest.fn<ReportLicenseFn>(() => true)

type Descriptor = { identifier: string; requiresLicense?: boolean }

function makeContainer(
  descriptors: Record<string, Descriptor>,
  packageMeta: Record<string, { name: string | null }>,
  backendUrl?: string,
) {
  const registrations: Record<string, unknown> = {}
  for (const key of Object.keys(descriptors)) registrations[key] = true
  registrations.somethingElse = true

  return {
    registrations,
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
    track.mockClear()
    reportLicense.mockClear()
    delete process.env.GORGO_LICENSE
    jest.doMock("@gorgo-store/license", () => ({ reportLicense }), { virtual: true })
  })

  it("does nothing when the verifier package is not installed", async () => {
    jest.dontMock("@gorgo-store/license")
    jest.doMock("@gorgo-store/license", () => {
      throw new Error("Cannot find module")
    }, { virtual: true })

    const container = makeContainer(
      { [`${PREFIX}a`]: { identifier: "a", requiresLicense: true } },
      { a: { name: "@gorgo-store/a" } },
    )
    await expect(run(container)).resolves.toBeUndefined()
    expect(reportLicense).not.toHaveBeenCalled()
  })

  it("skips providers that do not opt in", async () => {
    const container = makeContainer(
      {
        [`${PREFIX}free`]: { identifier: "free" },
        [`${PREFIX}paid`]: { identifier: "paid", requiresLicense: true },
      },
      { free: { name: "@gorgo/free" }, paid: { name: "@gorgo-store/paid" } },
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
        [`${PREFIX}p_one`]: { identifier: "p", requiresLicense: true },
        [`${PREFIX}p_two`]: { identifier: "p", requiresLicense: true },
      },
      { p: { name: "@gorgo-store/p" } },
    )
    await run(container)
    expect(reportLicense).toHaveBeenCalledTimes(1)
  })

  it("prefers options.licenses over GORGO_LICENSE", async () => {
    process.env.GORGO_LICENSE = "from-env"
    const container = makeContainer(
      { [`${PREFIX}p`]: { identifier: "p", requiresLicense: true } },
      { p: { name: "@gorgo-store/p" } },
      "https://shop.example.com",
    )
    await run(container, { licenses: { "@gorgo-store/p": "from-options" } })
    expect(reportLicense.mock.calls[0]?.[0]).toMatchObject({
      license: "from-options",
      backendUrl: "https://shop.example.com",
    })
  })

  it("falls back to GORGO_LICENSE", async () => {
    process.env.GORGO_LICENSE = "from-env"
    const container = makeContainer(
      { [`${PREFIX}p`]: { identifier: "p", requiresLicense: true } },
      { p: { name: "@gorgo-store/p" } },
    )
    await run(container)
    expect(reportLicense.mock.calls[0]?.[0]).toMatchObject({ license: "from-env" })
  })

  it("skips a provider whose package name cannot be resolved", async () => {
    const container = makeContainer(
      { [`${PREFIX}p`]: { identifier: "p", requiresLicense: true } },
      { p: { name: null } },
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
        [`${PREFIX}a`]: { identifier: "a", requiresLicense: true },
        [`${PREFIX}b`]: { identifier: "b", requiresLicense: true },
      },
      { a: { name: "@gorgo-store/a" }, b: { name: "@gorgo-store/b" } },
    )
    await expect(run(container)).resolves.toBeUndefined()
    expect(reportLicense).toHaveBeenCalledTimes(2)
  })
})
