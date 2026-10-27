import { readFileSync } from "node:fs"
import path from "node:path"
import { packageFrom } from "./package-manifest"

/** Where the reported host came from: `MEDUSA_BACKEND_URL`, `admin.backendUrl`, or neither (`localhost`). */
export type HostSource = "env" | "config" | "none"

export type Runtime = {
  medusa: string | null
  node: string
  node_env: string | null
  worker_mode: string | null
  /** ISO 8601. Tells ten live processes from one restarted ten times. */
  started_at: string
  /** A CI run, such as integration tests with a real key, is not an installation. */
  ci: boolean
  host_source: HostSource
}

/** The variables CI services set, the same list `@gorgo/telemetry` reads. */
const CI_VARS = [
  "CONTINUOUS_INTEGRATION",
  "BUILD_NUMBER",
  "GITHUB_ACTIONS",
  "GITLAB_CI",
  "CIRCLECI",
  "TRAVIS",
  "BITBUCKET_BUILD_NUMBER",
  "JENKINS_URL",
  "TEAMCITY_VERSION",
  "BUILDKITE",
  "DRONE",
  "APPVEYOR",
]

function isCI(): boolean {
  if (process.env.CI === "true" || process.env.CI === "1") return true
  return CI_VARS.some((name) => Boolean(process.env[name]))
}

/**
 * The Medusa version of the project the process runs in. `@medusajs/framework` does not export its
 * `package.json`, so its version is read from the manifest above its entry point.
 */
function medusaVersion(): string | null {
  const paths = [process.cwd()]
  try {
    const version = JSON.parse(readFileSync(require.resolve("@medusajs/medusa/package.json", { paths }), "utf8")).version
    if (typeof version === "string") return version
  } catch {
    // not every project depends on @medusajs/medusa directly
  }
  try {
    const entry = require.resolve("@medusajs/framework", { paths })
    return packageFrom(path.dirname(entry), "@medusajs/framework")?.version ?? null
  } catch {
    return null
  }
}

/** What the check reports about the process. */
export function runtimeOf(input: {
  workerMode: string | undefined
  hostSource: HostSource
  startedAt: number
}): Runtime {
  return {
    medusa: medusaVersion(),
    node: process.versions.node,
    node_env: process.env.NODE_ENV || null,
    worker_mode: input.workerMode || process.env.MEDUSA_WORKER_MODE || null,
    started_at: new Date(input.startedAt).toISOString(),
    ci: isCI(),
    host_source: input.hostSource,
  }
}
