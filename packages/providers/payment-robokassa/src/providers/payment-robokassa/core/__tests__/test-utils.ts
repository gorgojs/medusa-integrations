import { setupServer } from "msw/node"

export const ROBOKASSA_BASE_URL = "https://auth.robokassa.ru"
export const server = setupServer()

export function makeLogger() {
  const noop = () => {}
  return new Proxy({} as any, { get: () => noop })
}

export type CapturedRequest = {
  url: string
  method: string
  body: any
  queryParams: Record<string, string>
}

export async function captureRequest(request: Request): Promise<CapturedRequest> {
  const cloned = request.clone()
  const parsedUrl = new URL(cloned.url)
  const queryParams: Record<string, string> = {}
  parsedUrl.searchParams.forEach((value, key) => { queryParams[key] = value })
  let body: any = null
  try {
    body = await cloned.json()
  } catch {
    // json() consumed the clone's body stream — clone the original again for text
    try { body = await request.clone().text() } catch { body = null }
  }
  return { url: cloned.url, method: cloned.method, body, queryParams }
}
