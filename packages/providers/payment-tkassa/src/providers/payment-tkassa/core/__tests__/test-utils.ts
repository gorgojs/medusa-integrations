import { setupServer } from "msw/node"
import TkassaService from "../../services/tkassa"
import * as integrationWorkflows from "../../../../workflows/integration/workflows"

// `resolveOptions()` reads options via `getIntegrationOptionsWorkflow().run(...)`. In a real
// app this resolves through Medusa's global loaded-modules registry (populated at bootstrap);
// that registry doesn't exist in a plain Jest unit test, so the workflow itself is mocked
// here rather than fabricated as a fake DI container — `makeProvider()` below configures its
// return value per test from the given options.
jest.mock("../../../../workflows/integration/workflows")

export const TKASSA_BASE_URL = "https://securepay.tinkoff.ru"

export const server = setupServer()

export function makeLogger() {
  const noop = () => {}
  return new Proxy({} as any, {
    get: () => noop,
  })
}

/**
 * Mock of the `integration` module service as seen from the payment provider's
 * container — `resolveOptions()` reads options via `getResolvedOptions()`.
 */
export function makeIntegration(options: Record<string, any>) {
  return {
    getResolvedOptions: async () => ({
      options,
      meta: {
        provider_id: "int_tkassa",
        category: "payment",
        is_enabled: true,
      },
    }),
  }
}

/**
 * Build a T-Kassa payment provider whose options resolve from a mock `integration`
 * module (the single source of truth after the config-options fallback was removed).
 */
export function makeProvider(options: Record<string, any> = {}): any {
  const integration = makeIntegration(options)
  const mockedWorkflow = integrationWorkflows.getIntegrationOptionsWorkflow as unknown as jest.Mock
  mockedWorkflow.mockReturnValue({
    run: async () => ({ result: await integration.getResolvedOptions() }),
  })
  return new (TkassaService as any)({ logger: makeLogger() }, options)
}

export type CapturedRequest = {
  url: string
  method: string
  body: any
}

export async function captureRequest(request: Request): Promise<CapturedRequest> {
  const cloned = request.clone()
  let body: any = null
  try {
    body = await cloned.json()
  } catch {
    body = await cloned.text()
  }
  return { url: cloned.url, method: cloned.method, body }
}
