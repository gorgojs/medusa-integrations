import type { GeolocationContext, GeolocationProvider } from "../types"

const COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-appengine-country",
  "fastly-client-country",
  "x-geo-country",
  "x-country-code",
]

const UNKNOWN_CODES = new Set(["xx", "t1", "zz"])

const normalize = (value?: string | null): string | null => {
  const code = value?.trim().toLowerCase()

  if (!code || code.length !== 2 || UNKNOWN_CODES.has(code)) {
    return null
  }

  return code
}

export const countryFromPlatform = ({
  headers,
  cf,
}: GeolocationContext): string | null => {
  const fromRuntime = normalize(cf?.country)

  if (fromRuntime) {
    return fromRuntime
  }

  for (const header of COUNTRY_HEADERS) {
    const code = normalize(headers.get(header))

    if (code) {
      return code
    }
  }

  return null
}

const platformProvider: GeolocationProvider = {
  name: "platform",
  lookup: async (context) => countryFromPlatform(context),
}

export default platformProvider
