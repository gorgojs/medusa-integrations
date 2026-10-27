import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  configureLicense,
  licenseState,
  licenseStates,
  recheckLicense,
  registerLicensedPackage,
  resetLicenseStatesForTests,
} from "../license"
import { VERIFY_URLS } from "../urls"

const TOKEN = "gorgo_live_" + "ab".repeat(24)
const OTHER_TOKEN = "gorgo_live_" + "cd".repeat(24)
const TKASSA = "@gorgo-store/medusa-payment-tkassa"
const ONEC = "@gorgo-store/medusa-erp-1c"

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const PROCESS_KEY = Symbol.for("gorgo.process")
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/** What CI services set. Cleared around every test, so a run in CI does not flip `runtime.ci`. */
const CI_VARS = [
  "CI", "CONTINUOUS_INTEGRATION", "BUILD_NUMBER", "GITHUB_ACTIONS", "GITLAB_CI", "CIRCLECI", "TRAVIS",
  "BITBUCKET_BUILD_NUMBER", "JENKINS_URL", "TEAMCITY_VERSION", "BUILDKITE", "DRONE", "APPVEYOR",
]
const savedCiVars: Record<string, string | undefined> = {}

type Reply =
  | { status?: number; body?: unknown; headers?: Record<string, string>; raw?: string }
  | "network"

function mockFetch(replies: Reply[]) {
  const calls: { url: string; body: any }[] = []
  global.fetch = jest.fn(async (url: any, init: any) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) })
    const reply = replies.length > 1 ? replies.shift()! : replies[0]!
    if (reply === "network") throw new Error("ECONNREFUSED")
    return new Response(reply.raw ?? JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: reply.headers,
    })
  }) as any
  return calls
}

async function flush(ms: number) {
  await jest.advanceTimersByTimeAsync(ms)
}

/** A package directory the way a plugin build lays it out: the manifest at the root, code below. */
function packageDir(name: string, version: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "gorgo-license-"))
  const nested = path.join(root, ".medusa", "server", "src")
  mkdirSync(nested, { recursive: true })
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ name, version }))
  return nested
}

/** A project directory with Medusa installed, for the runtime the check reports. */
function projectWithMedusa(version: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "gorgo-project-"))
  const medusa = path.join(root, "node_modules", "@medusajs", "medusa")
  mkdirSync(medusa, { recursive: true })
  writeFileSync(path.join(medusa, "package.json"), JSON.stringify({ name: "@medusajs/medusa", version }))
  return root
}

function okReply(packages: Record<string, unknown>[]) {
  return {
    body: {
      ok: true,
      project: { handle: "shop", name: "Shop" },
      environment: { id: "env_1", name: "Production" },
      packages,
    },
  }
}

function okPackage(name: string, extra: Record<string, unknown> = {}) {
  return { name, ok: true, cutoff: null, ends_at: "2027-01-01T00:00:00.000Z", latest_allowed_version: null, ...extra }
}

function setup(input: Parameters<typeof configureLicense>[0] = {}) {
  const logger = { warn: jest.fn(), info: jest.fn() }
  const onChange = jest.fn()
  configureLicense({ license: TOKEN, backendUrl: "https://shop.example.com", logger, onChange, ...input })
  return { ...logger, onChange }
}

beforeEach(() => {
  jest.useFakeTimers()
  resetLicenseStatesForTests()
  delete (globalThis as Record<symbol, unknown>)[PROCESS_KEY]
  for (const name of CI_VARS) {
    savedCiVars[name] = process.env[name]
    delete process.env[name]
  }
  delete process.env.GORGO_LICENSE
  delete process.env.GORGO_LICENSE_URL
  delete process.env.MEDUSA_BACKEND_URL
  delete process.env.MEDUSA_WORKER_MODE
})

afterEach(() => {
  resetLicenseStatesForTests()
  jest.useRealTimers()
  jest.restoreAllMocks()
  for (const name of CI_VARS) {
    if (savedCiVars[name] === undefined) delete process.env[name]
    else process.env[name] = savedCiVars[name]
  }
})

describe("registerLicensedPackage", () => {
  it("checks every package of the process in one request after the debounce", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA), okPackage(ONEC)])])
    setup()
    registerLicensedPackage({ packageDir: packageDir(TKASSA, "0.10.1") })
    registerLicensedPackage({ packageDir: packageDir(ONEC, "0.2.2") })

    expect(licenseState(TKASSA)).toEqual({ state: "pending" })
    await flush(1_999)
    expect(calls).toHaveLength(0)

    await flush(1)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe(VERIFY_URLS[0])
    expect(calls[0]!.body).toMatchObject({
      license: TOKEN,
      host: "shop.example.com",
      packages: [
        { name: TKASSA, version: "0.10.1" },
        { name: ONEC, version: "0.2.2" },
      ],
    })
    expect(licenseState(TKASSA)).toMatchObject({ state: "ok" })
    expect(licenseState(ONEC)).toMatchObject({ state: "ok" })
  })

  it("takes the name and version a caller already knows", async () => {
    const calls = mockFetch([okReply([okPackage(ONEC)])])
    setup()
    registerLicensedPackage({ packageName: ONEC, packageVersion: "0.2.2" })
    await flush(2_000)
    expect(calls[0]!.body.packages).toEqual([{ name: ONEC, version: "0.2.2" }])
  })

  it("reads the version of a named package from its own manifest", async () => {
    const calls = mockFetch([okReply([okPackage(ONEC)])])
    setup()
    registerLicensedPackage({ packageName: ONEC, packageDir: packageDir(ONEC, "0.2.2") })
    await flush(2_000)
    expect(calls[0]!.body.packages).toEqual([{ name: ONEC, version: "0.2.2" }])
  })

  it("skips a package whose name cannot be found", async () => {
    const calls = mockFetch([okReply([])])
    setup()
    const empty = mkdtempSync(path.join(tmpdir(), "gorgo-empty-"))
    expect(() => registerLicensedPackage({ packageDir: empty })).not.toThrow()
    await flush(2_000)
    expect(calls).toHaveLength(0)
    expect(licenseStates()).toEqual({})
  })

  it("sends the whole set again when a package registers after the check", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA), okPackage(ONEC)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    registerLicensedPackage({ packageName: ONEC, packageVersion: "0.2.2" })
    await flush(2_000)

    expect(calls).toHaveLength(2)
    expect(calls[1]!.body.packages.map((p: { name: string }) => p.name)).toEqual([TKASSA, ONEC])
  })

  it("does not ask again for a package registered twice", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls).toHaveLength(1)
  })

  it("returns the name it registered, so a caller can pick its own verdicts", () => {
    expect(registerLicensedPackage({ packageDir: packageDir(TKASSA, "0.10.1") })).toBe(TKASSA)
    expect(registerLicensedPackage({ packageDir: mkdtempSync(path.join(tmpdir(), "gorgo-empty-")) })).toBeUndefined()
  })

  it("never throws, even on input it cannot use", () => {
    expect(() => registerLicensedPackage(undefined as any)).not.toThrow()
    expect(() => registerLicensedPackage({ packageDir: 42 as any })).not.toThrow()
  })
})

describe("the key", () => {
  it("fails every package on a missing key without touching the network", async () => {
    const calls = mockFetch([okReply([])])
    const { warn, onChange } = setup({ license: undefined })
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)

    expect(licenseState(TKASSA)).toMatchObject({ state: "failed", reason: "missing" })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("GORGO_LICENSE is not set"))
    expect(onChange).toHaveBeenCalledWith(TKASSA, expect.objectContaining({ state: "failed", reason: "missing" }), { state: "pending" })
    expect(calls).toHaveLength(0)
  })

  it("reads GORGO_LICENSE when no key is configured", async () => {
    process.env.GORGO_LICENSE = TOKEN
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup({ license: undefined })
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls[0]!.body.license).toBe(TOKEN)
  })

  it("refuses something that is not a project key", async () => {
    const calls = mockFetch([okReply([])])
    setup({ license: "GORGO-LIC-old.offline.key" })
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(licenseState(TKASSA)).toMatchObject({ state: "failed", reason: "malformed" })
    expect(calls).toHaveLength(0)
  })

  it("keeps the first key and warns when another caller passes a different one", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    const { warn } = setup()
    configureLicense({ license: OTHER_TOKEN })
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls[0]!.body.license).toBe(TOKEN)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("different license key"))
  })
})

describe("the host", () => {
  it("prefers MEDUSA_BACKEND_URL over the configured backend URL", async () => {
    process.env.MEDUSA_BACKEND_URL = "https://api.shop.example.com"
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup({ backendUrl: "https://ignored.example.com" })
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls[0]!.body.host).toBe("api.shop.example.com")
  })

  it("sends localhost when the backend URL is relative", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup({ backendUrl: "/" })
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls[0]!.body.host).toBe("localhost")
  })

  it("checks again when the backend URL arrives after the first check", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup({ backendUrl: undefined })
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    configureLicense({ backendUrl: "https://shop.example.com" })
    await flush(2_000)
    expect(calls.map((c) => c.body.host)).toEqual(["localhost", "shop.example.com"])
  })
})

describe("the runtime", () => {
  it("sends the Medusa and Node versions, the environment and the worker mode", async () => {
    jest.spyOn(process, "cwd").mockReturnValue(projectWithMedusa("2.21.1"))
    const env = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup({ workerMode: "server" })
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    process.env.NODE_ENV = env

    expect(calls[0]!.body.runtime).toEqual({
      medusa: "2.21.1",
      node: process.versions.node,
      node_env: "production",
      worker_mode: "server",
      started_at: expect.stringMatching(ISO),
      ci: false,
      host_source: "config",
    })
  })

  it.each([
    ["env", { MEDUSA_BACKEND_URL: "https://api.shop.example.com" }, "https://ignored.example.com"],
    ["config", {}, "https://api.shop.example.com"],
    ["none", {}, "/"],
    ["none", {}, undefined],
  ])("says the host came from %s", async (source, env, backendUrl) => {
    Object.assign(process.env, env)
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup({ backendUrl })
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls[0]!.body.runtime.host_source).toBe(source)
  })

  it("flags a process that runs in CI", async () => {
    process.env.GITHUB_ACTIONS = "true"
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls[0]!.body.runtime.ci).toBe(true)
  })

  it("falls back to MEDUSA_WORKER_MODE and to null when Medusa is not found", async () => {
    jest.spyOn(process, "cwd").mockReturnValue(mkdtempSync(path.join(tmpdir(), "gorgo-bare-")))
    process.env.MEDUSA_WORKER_MODE = "worker"
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls[0]!.body.runtime).toMatchObject({ medusa: null, worker_mode: "worker" })
  })

  it("sends the same process id with every request", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    await flush(25 * HOUR)
    expect(calls).toHaveLength(2)
    expect(calls[0]!.body.instance).toMatch(/^[0-9a-f-]{36}$/)
    expect(calls[1]!.body.instance).toBe(calls[0]!.body.instance)
  })
})

describe("the process id", () => {
  it("takes the id and the start time telemetry already holds", async () => {
    ;(globalThis as Record<symbol, unknown>)[PROCESS_KEY] = { id: "session-from-telemetry", started_at: Date.UTC(2026, 9, 26, 9) }
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls[0]!.body.instance).toBe("session-from-telemetry")
    expect(calls[0]!.body.runtime.started_at).toBe("2026-10-26T09:00:00.000Z")
  })

  it("leaves the id it creates for telemetry to pick up", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    const shared = (globalThis as Record<symbol, { id: string; started_at: number }>)[PROCESS_KEY]
    expect(calls[0]!.body.instance).toMatch(/^[0-9a-f-]{36}$/)
    expect(shared.id).toBe(calls[0]!.body.instance)
    expect(new Date(shared.started_at).toISOString()).toBe(calls[0]!.body.runtime.started_at)
  })

  it("sends one id from two copies of the library in one process", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA)]), okReply([okPackage(ONEC)])])
    let other: typeof import("../license") | undefined
    jest.isolateModules(() => {
      other = require("../license")
    })
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    other!.configureLicense({ license: TOKEN, logger: { warn: jest.fn(), info: jest.fn() } })
    other!.registerLicensedPackage({ packageName: ONEC, packageVersion: "0.2.2" })
    await flush(2_000)
    other!.resetLicenseStatesForTests()

    expect(calls).toHaveLength(2)
    expect(calls[1]!.body.instance).toBe(calls[0]!.body.instance)
  })
})

describe("the verdict", () => {
  it("fills the project, the environment and the subscription from the reply", async () => {
    mockFetch([
      okReply([
        okPackage(TKASSA, {
          cutoff: "2026-09-01T00:00:00.000Z",
          ends_at: "2026-09-01T00:00:00.000Z",
          latest_allowed_version: "0.10.0",
        }),
      ]),
    ])
    const { info } = setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.0" })
    await flush(2_000)

    expect(licenseState(TKASSA)).toEqual({
      state: "ok",
      checkedAt: expect.any(Number),
      host: "shop.example.com",
      project: { handle: "shop", name: "Shop" },
      environment: { id: "env_1", name: "Production" },
      subscription: { ends_at: "2026-09-01T00:00:00.000Z", cutoff: "2026-09-01T00:00:00.000Z" },
      latestAllowedVersion: "0.10.0",
    })
    expect(info).toHaveBeenCalledWith(expect.stringContaining("up to 2026-09-01"))
  })

  it("keeps the link to the project and whether the subscription renews", async () => {
    const reply = okReply([okPackage(TKASSA, { renews: true })])
    reply.body.project = { handle: "shop", name: "Shop", url: "https://app.gorgojs.com/org_1/projects/prj_1/key" } as any
    mockFetch([reply])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(licenseState(TKASSA)).toMatchObject({
      project: { handle: "shop", name: "Shop", url: "https://app.gorgojs.com/org_1/projects/prj_1/key" },
      subscription: { renews: true },
    })
  })

  it("drops a project link that is not https", async () => {
    const reply = okReply([okPackage(TKASSA)])
    reply.body.project = { handle: "shop", name: "Shop", url: "javascript:alert(1)" } as any
    mockFetch([reply])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(licenseState(TKASSA)?.project).toEqual({ handle: "shop", name: "Shop" })
    expect(licenseState(TKASSA)?.subscription).not.toHaveProperty("renews")
  })

  it("keeps the cutoff and the last allowed version of a version released after it", async () => {
    mockFetch([
      okReply([
        { name: ONEC, ok: false, reason: "version_after_cutoff", cutoff: "2026-10-12T00:00:00.000Z", latest_allowed_version: "1.2.4" },
      ]),
    ])
    setup()
    registerLicensedPackage({ packageName: ONEC, packageVersion: "1.3.0" })
    await flush(2_000)
    expect(licenseState(ONEC)).toMatchObject({
      state: "failed",
      reason: "version_after_cutoff",
      host: "shop.example.com",
      subscription: { cutoff: "2026-10-12T00:00:00.000Z" },
      latestAllowedVersion: "1.2.4",
    })
  })

  it("keeps a host outside the project's environments as a null environment", async () => {
    mockFetch([{ body: { ok: true, project: { handle: "shop", name: "Shop" }, environment: null, packages: [okPackage(TKASSA)] } }])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(licenseState(TKASSA)).toMatchObject({ state: "ok", environment: null })
  })

  it.each(["no_subscription", "domain_not_allowed", "version_after_cutoff", "version_unverifiable"])(
    "fails a package refused with %s and confirms the rest",
    async (reason) => {
      mockFetch([okReply([okPackage(TKASSA), { name: ONEC, ok: false, reason }])])
      const { warn, onChange } = setup()
      registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
      registerLicensedPackage({ packageName: ONEC, packageVersion: "0.2.2" })
      await flush(2_000)

      expect(licenseState(TKASSA)).toMatchObject({ state: "ok" })
      expect(licenseState(ONEC)).toMatchObject({ state: "failed", reason, project: { handle: "shop", name: "Shop" } })
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(`${ONEC}: unlicensed`))
      expect(onChange).toHaveBeenCalledWith(ONEC, expect.objectContaining({ state: "failed", reason }), { state: "pending" })
    },
  )

  it("fails every package when the key is unknown", async () => {
    mockFetch([{ body: { ok: false, reason: "invalid_token" } }])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    registerLicensedPackage({ packageName: ONEC, packageVersion: "0.2.2" })
    await flush(2_000)
    expect(licenseState(TKASSA)).toMatchObject({ state: "failed", reason: "invalid_token" })
    expect(licenseState(ONEC)).toMatchObject({ state: "failed", reason: "invalid_token" })
  })

  it("maps an unknown refusal reason to unknown", async () => {
    mockFetch([okReply([{ name: TKASSA, ok: false, reason: "made_up" }])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(licenseState(TKASSA)).toMatchObject({ state: "failed", reason: "unknown" })
  })

  it("fails a package the reply does not mention", async () => {
    mockFetch([okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    registerLicensedPackage({ packageName: ONEC, packageVersion: "0.2.2" })
    await flush(2_000)
    expect(licenseState(ONEC)).toMatchObject({ state: "failed", reason: "unknown" })
  })

  it("rechecks within a day and logs only when the verdict changes", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    const { info, onChange } = setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)

    await flush(23 * HOUR - 1)
    expect(calls).toHaveLength(1)
    await flush(3 * HOUR)
    expect(calls).toHaveLength(2)
    expect(info).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe("when the service does not answer", () => {
  it("falls back to the second address, then marks every package unreachable", async () => {
    const calls = mockFetch(["network", "network", okReply([okPackage(TKASSA)])])
    const { warn, onChange } = setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)

    expect(calls.map((c) => c.url)).toEqual([...VERIFY_URLS])
    expect(licenseState(TKASSA)).toMatchObject({ state: "unreachable" })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("could not reach"))
    expect(onChange).toHaveBeenCalledWith(TKASSA, expect.objectContaining({ state: "unreachable" }), { state: "pending" })
  })

  it("retries in fifteen minutes, give or take five", async () => {
    const calls = mockFetch(["network", "network", okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    await flush(10 * MINUTE - 1)
    expect(calls).toHaveLength(2)
    await flush(11 * MINUTE)
    expect(calls).toHaveLength(3)
    expect(licenseState(TKASSA)).toMatchObject({ state: "ok" })
  })

  it("treats a server error and an oversized reply as unreachable", async () => {
    mockFetch([{ status: 502 }, { raw: "x".repeat(17 * 1024) }])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(licenseState(TKASSA)).toMatchObject({ state: "unreachable" })
  })

  it("waits for Retry-After on 429 and keeps the previous verdict", async () => {
    const calls = mockFetch([
      { status: 429, body: { ok: false, reason: "rate_limited" }, headers: { "retry-after": "120" } },
      okReply([okPackage(TKASSA)]),
    ])
    const { warn, onChange } = setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)

    expect(calls).toHaveLength(1)
    expect(licenseState(TKASSA)).toEqual({ state: "pending" })
    expect(warn).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()

    await flush(120 * 1000 - 1)
    expect(calls).toHaveLength(1)
    await flush(1)
    expect(calls).toHaveLength(2)
    expect(licenseState(TKASSA)).toMatchObject({ state: "ok" })
  })

  it("asks the platform even when GORGO_LICENSE_URL points elsewhere", async () => {
    process.env.GORGO_LICENSE_URL = "http://localhost:9000/license/verify"
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls.map((c) => c.url)).toEqual([VERIFY_URLS[0]])
  })

  it("asks the public API first and the cabinet as the fallback, never the admin host", async () => {
    const calls = mockFetch(["network", "network"])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.gorgojs.com/v1/licenses/check",
      "https://app.gorgojs.com/license/verify",
    ])
  })
})

describe("configureLicense", () => {
  it("notifies every listener, not only the last one configured", async () => {
    mockFetch([okReply([okPackage(TKASSA)])])
    const { onChange } = setup()
    const second = jest.fn()
    configureLicense({ onChange: second })
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(onChange).toHaveBeenCalledWith(TKASSA, expect.objectContaining({ state: "ok" }), { state: "pending" })
    expect(second).toHaveBeenCalledWith(TKASSA, expect.objectContaining({ state: "ok" }), { state: "pending" })
  })

  it("survives a listener and a logger that throw", async () => {
    mockFetch([okReply([{ name: TKASSA, ok: false, reason: "no_subscription" }])])
    const boom = () => {
      throw new Error("boom")
    }
    expect(() => configureLicense({ license: TOKEN, onChange: boom, logger: { warn: boom, info: boom } })).not.toThrow()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(licenseState(TKASSA)).toMatchObject({ state: "failed", reason: "no_subscription" })
  })

  it("checks with defaults from the environment when nobody configures it", async () => {
    process.env.GORGO_LICENSE = TOKEN
    process.env.MEDUSA_BACKEND_URL = "https://api.shop.example.com"
    jest.spyOn(console, "info").mockImplementation(() => undefined)
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(calls[0]!.body).toMatchObject({ license: TOKEN, host: "api.shop.example.com" })
  })
})

describe("recheckLicense", () => {
  it("checks right away and resolves with the fresh verdict", async () => {
    const calls = mockFetch([okReply([{ name: TKASSA, ok: false, reason: "domain_not_allowed" }]), okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    await flush(2_000)
    expect(licenseState(TKASSA)).toMatchObject({ state: "failed" })

    const done = recheckLicense()
    await flush(0)
    await done
    expect(calls).toHaveLength(2)
    expect(licenseState(TKASSA)).toMatchObject({ state: "ok" })
  })

  it("joins a check that is already running instead of starting another", async () => {
    const calls = mockFetch([okReply([okPackage(TKASSA)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    const first = recheckLicense()
    const second = recheckLicense()
    await flush(0)
    await Promise.all([first, second])
    expect(calls).toHaveLength(1)
  })

  it("resolves when nothing is registered", async () => {
    const calls = mockFetch([okReply([])])
    await expect(recheckLicense()).resolves.toBeUndefined()
    expect(calls).toHaveLength(0)
  })
})

describe("licenseStates", () => {
  it("lists every registered package", async () => {
    mockFetch([okReply([okPackage(TKASSA), okPackage(ONEC)])])
    setup()
    registerLicensedPackage({ packageName: TKASSA, packageVersion: "0.10.1" })
    registerLicensedPackage({ packageName: ONEC, packageVersion: "0.2.2" })
    await flush(2_000)
    expect(Object.keys(licenseStates()).sort()).toEqual([ONEC, TKASSA])
  })
})
