import { setupServer } from "msw/node"
import TkassaService from "../../services/tkassa"

export const TKASSA_BASE_URL = "https://securepay.tinkoff.ru"

export const server = setupServer()

export function makeLogger() {
  const noop = () => {}
  return new Proxy({} as any, {
    get: () => noop,
  })
}

export function makeProvider(options: Record<string, any> = {}): any {
  const container = { logger: makeLogger() }
  const provider = new (TkassaService as any)(container, options)
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
