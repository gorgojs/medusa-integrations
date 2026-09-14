import { resolveClientIp } from "./client-ip"
import ipApiProvider from "./providers/ip-api"
import platformProvider from "./providers/platform"
import type { GeolocationContext, GeolocationProvider } from "./types"

export const geolocationProvider = process.env.GEOLOCATION_PROVIDER

export const isIpApi = (provider?: string) => provider === "ip-api"

export const resolveGeolocationProvider = (): GeolocationProvider => {
  switch (true) {
    case isIpApi(geolocationProvider):
      return ipApiProvider
    default:
      return platformProvider
  }
}

export type Detection = {
  countryCode: string | null
  provider: string
  ip: string
}

export const detectCountry = async (
  context: GeolocationContext
): Promise<Detection> => {
  const provider = resolveGeolocationProvider()
  const client = resolveClientIp(context.headers)

  const countryCode = await provider
    .lookup(context)
    .catch(() => null)

  return {
    countryCode,
    provider: provider.name,
    ip: client.kind === "public" ? client.ip : client.kind,
  }
}
