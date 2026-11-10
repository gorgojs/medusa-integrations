/** The locales Mollie's payment page takes (`Locale2` in mollie-api-typescript). */
export const MOLLIE_LOCALES = [
  "ca_ES",
  "cs_CZ",
  "da_DK",
  "de_AT",
  "de_CH",
  "de_DE",
  "de_LU",
  "el_GR",
  "en_BE",
  "en_GB",
  "en_NL",
  "en_US",
  "es_ES",
  "fi_FI",
  "fr_BE",
  "fr_FR",
  "fr_LU",
  "hu_HU",
  "is_IS",
  "it_IT",
  "lt_LT",
  "lv_LV",
  "nb_NO",
  "nl_BE",
  "nl_NL",
  "pl_PL",
  "pt_PT",
  "sk_SK",
  "sl_SI",
  "sv_SE",
  "tr_TR",
] as const

export type MollieLocale = (typeof MOLLIE_LOCALES)[number]

const KNOWN = new Set<string>(MOLLIE_LOCALES)

/** The locale a bare language gets: the country where the language is first spoken. */
const BY_LANGUAGE: Record<string, MollieLocale> = {
  ca: "ca_ES",
  cs: "cs_CZ",
  da: "da_DK",
  de: "de_DE",
  el: "el_GR",
  en: "en_US",
  es: "es_ES",
  fi: "fi_FI",
  fr: "fr_FR",
  hu: "hu_HU",
  is: "is_IS",
  it: "it_IT",
  lt: "lt_LT",
  lv: "lv_LV",
  nb: "nb_NO",
  no: "nb_NO",
  nl: "nl_NL",
  pl: "pl_PL",
  pt: "pt_PT",
  sk: "sk_SK",
  sl: "sl_SI",
  sv: "sv_SE",
  tr: "tr_TR",
}

/**
 * The storefront's locale as Mollie takes it: `nl-BE` and `nl_BE` as `nl_BE`, a bare `de` as
 * `de_DE`. Anything else gives `undefined`, and Mollie then picks the language from the browser.
 */
export function toMollieLocale(value: unknown): MollieLocale | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const [language, region] = value.trim().replace("-", "_").split("_")
  if (!language) {
    return undefined
  }
  const lower = language.toLowerCase()
  if (region) {
    const full = `${lower}_${region.toUpperCase()}`
    if (KNOWN.has(full)) {
      return full as MollieLocale
    }
  }
  return BY_LANGUAGE[lower]
}
