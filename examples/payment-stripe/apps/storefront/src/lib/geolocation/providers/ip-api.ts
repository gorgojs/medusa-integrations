import { resolveClientIp } from "../client-ip"
import { withLookupCache } from "../lookup-cache"
import type { GeolocationProvider } from "../types"
import { countryFromPlatform } from "./platform"

const FIELDS = "status,countryCode"
const TIMEOUT_MS = 1500
const LOCAL_TIMEOUT_MS = 5000
const DEFAULT_THROTTLE_S = 60
const LOCAL_TTL_MS = 0

type IpApiResponse = {
  status?: string
  countryCode?: string
}

let throttledUntil = 0

const buildUrl = (ip: string | null): string => {
  const apiKey = process.env.GEOLOCATION_PROVIDER_API_KEY
  const target = ip ?? ""

  return apiKey
    ? `https://pro.ip-api.com/json/${target}?fields=${FIELDS}&key=${apiKey}`
    : `http://ip-api.com/json/${target}?fields=${FIELDS}`
}

const throttleFor = (headers: Headers) => {
  const ttl = Number(headers.get("x-ttl"))
  throttledUntil =
    Date.now() +
    (Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_THROTTLE_S) * 1000
}

const query = async (
  ip: string | null,
  timeoutMs: number
): Promise<string | null | undefined> => {
  if (Date.now() < throttledUntil) {
    return undefined
  }

  try {
    const response = await fetch(buildUrl(ip), {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (response.status === 429) {
      throttleFor(response.headers)
      return undefined
    }

    if (response.headers.get("x-rl") === "0") {
      throttleFor(response.headers)
    }

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as IpApiResponse

    if (data.status !== "success") {
      return null
    }

    return data.countryCode?.trim().toLowerCase() || null
  } catch {
    return null
  }
}

const ipApiProvider: GeolocationProvider = {
  name: "ip-api",
  lookup: async (context) => {
    const fromPlatform = countryFromPlatform(context)

    if (fromPlatform) {
      return fromPlatform
    }

    const client = resolveClientIp(context.headers)

    if (client.kind === "public") {
      return withLookupCache(`ip-api:${client.ip}`, () =>
        query(client.ip, TIMEOUT_MS)
      )
    }

    if (client.kind === "local") {
      return withLookupCache(
        "ip-api:self",
        () => query(null, LOCAL_TIMEOUT_MS),
        LOCAL_TTL_MS
      )
    }

    return null
  },
}

export default ipApiProvider
