import { setupServer } from "msw/node"
import YookassaService from "../../services/yookassa"

export const YOOKASSA_BASE_URL = "https://api.yookassa.ru/v3"

export const server = setupServer()

export function makeLogger() {
  const noop = () => {}
  return new Proxy({} as any, {
    get: () => noop,
  })
}

export function makeProvider(options: Record<string, any> = {}): any {
  const provider = new (YookassaService as any)({ logger: makeLogger() }, options)
  provider.resolveOptions = async () => options
  return provider
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
