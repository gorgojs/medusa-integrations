import { setupServer } from "msw/node"

export const YOOKASSA_BASE_URL = "https://api.yookassa.ru/v3"

export const server = setupServer()

export function makeLogger() {
  const noop = () => {}
  return new Proxy({} as any, {
    get: () => noop,
  })
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
