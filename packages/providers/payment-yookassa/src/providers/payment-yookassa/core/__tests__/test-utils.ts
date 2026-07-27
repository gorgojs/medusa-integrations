import { setupServer } from "msw/node"
import YookassaService from "../../services/yookassa"
import * as integrationWorkflows from "../../../../workflows/integration/workflows"

jest.mock("../../../../workflows/integration/workflows")

export const YOOKASSA_BASE_URL = "https://api.yookassa.ru/v3"

export const server = setupServer()

export function makeLogger() {
  const noop = () => {}
  return new Proxy({} as any, {
    get: () => noop,
  })
}

export function makeIntegration(options: Record<string, any>) {
  return {
    getResolvedOptions: async () => ({
      options,
      meta: {
        provider_id: "int_yookassa",
        category: "payment",
        is_enabled: true,
      },
    }),
  }
}

export function makeProvider(options: Record<string, any> = {}): any {
  const integration = makeIntegration(options)
  const mockedWorkflow = integrationWorkflows.getIntegrationOptionsWorkflow as unknown as jest.Mock
  mockedWorkflow.mockReturnValue({
    run: async () => ({ result: await integration.getResolvedOptions() }),
  })
  return new (YookassaService as any)({ logger: makeLogger() }, options)
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
