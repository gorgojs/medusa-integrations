import { locales, defaultLocale } from "@i18n/config"
import { getBaseURL } from "@lib/util/env"

const BASE = getBaseURL().replace(/\/$/, "")

export function buildAlternates(locale: string, path: string) {
  const suffix = path === "/" ? "" : path

  const languages: Record<string, string> = {
    "x-default": `${BASE}/${defaultLocale}${suffix}`,
  }

  for (const l of locales) {
    languages[l] = `${BASE}/${l}${suffix}`
  }

  return {
    canonical: `${BASE}/${locale}${suffix}`,
    languages,
  }
}
