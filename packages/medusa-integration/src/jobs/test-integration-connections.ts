import type { MedusaContainer, Logger } from "@medusajs/framework/types"
import { INTEGRATION_MODULE } from "../modules/integration"
import type IntegrationModuleService from "../modules/integration/services/integration-module"
import { testIntegrationConnectionWorkflow } from "../workflows/integration"

/** A per-integration test result: the provider's `passed`/`failed`/`skipped`, or `errored` (threw). */
export type TestOutcome = "passed" | "failed" | "skipped" | "errored"
export type OutcomeCounts = Record<TestOutcome, number>

/** Tally outcomes into per-status buckets. Buckets are keyed by the status itself — no mapping. */
export function tallyOutcomes(outcomes: Iterable<TestOutcome>): OutcomeCounts {
  const counts: OutcomeCounts = { passed: 0, failed: 0, skipped: 0, errored: 0 }
  for (const o of outcomes) counts[o]++
  return counts
}

/** The end-of-run summary line. `passed`→"ok", `failed`→"fail" for human-readable output. */
export function formatConnectionTestSummary(counts: OutcomeCounts): string {
  return (
    `[integration] connection-test job done — ok: ${counts.passed}, fail: ${counts.failed}, ` +
    `skipped: ${counts.skipped}, errored: ${counts.errored}`
  )
}

/**
 * Daily health check: run the connection test for every configured & enabled integration
 * that exposes one. Each test runs through `testIntegrationConnectionWorkflow`, which
 * persists `last_test_*` on the record and emits `integration.tested`.
 *
 * Disabled or not-yet-configured registrations are skipped (their settings don't resolve,
 * so a test would report a misleading "Not configured" failure), as are providers without
 * a `testConnection`. Failures are isolated per provider and nothing is thrown at the top
 * level, so one bad integration never aborts the rest and the job retries next schedule.
 */
export default async function testIntegrationConnectionsJob(container: MedusaContainer) {
  const logger = container.resolve<Logger>("logger")
  const service: IntegrationModuleService = container.resolve(INTEGRATION_MODULE)

  const { integrations } = await service.listIntegrationsOverview()
  const targets = integrations.filter(
    (i) => i.is_configured && i.is_enabled && i.has_test_connection
  )

  if (targets.length === 0) {
    logger.info("[integration] connection-test job: no configured integrations to test")
    return
  }

  logger.info(`[integration] connection-test job: testing ${targets.length} integration(s)`)

  const outcomes: TestOutcome[] = []

  for (const target of targets) {
    try {
      const { result } = await testIntegrationConnectionWorkflow(container).run({
        input: { provider_id: target.provider_id },
      })
      outcomes.push(result.status)
      const line = `[integration] ${target.provider_id} → ${result.status}${
        result.message ? `: ${result.message}` : ""
      }`
      if (result.status === "failed") logger.warn(line)
      else logger.info(line)
    } catch (e: any) {
      outcomes.push("errored")
      logger.error(`[integration] ${target.provider_id} test errored: ${e?.message ?? e}`)
    }
  }

  logger.info(formatConnectionTestSummary(tallyOutcomes(outcomes)))
}

export const config = {
  name: "test-integration-connections-daily",
  // Once a day, off-peak (03:00). Cron: minute hour day-of-month month day-of-week.
  schedule: "0 3 * * *",
}
