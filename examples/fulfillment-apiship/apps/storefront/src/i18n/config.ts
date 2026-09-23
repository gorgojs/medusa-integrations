export const locales = [
  "ar",
  "bg",
  "bn",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "fi",
  "fr",
  "he",
  "hi",
  "hu",
  "id",
  "it",
  "ja",
  "ka",
  "ko",
  "lt",
  "mn",
  "ms",
  "nb",
  "nl",
  "pl",
  "pt",
  "ro",
  "ru",
  "sk",
  "sv",
  "th",
  "tl",
  "tr",
  "uk",
  "vi",
  "zh",
] as const

export const defaultLocale = "en" as const satisfies AppLocale

export type AppLocale = (typeof locales)[number]

/**
 * Locales written right-to-left. Add new ones here only — every dir-aware
 * consumer (`<html dir>`, Radix roots, motion offsets) reads this.
 */
export const rtlLocales = ["ar", "he"] as const satisfies readonly AppLocale[]

export type LocaleDirection = "ltr" | "rtl"

export const getLocaleDir = (locale: string): LocaleDirection =>
  (rtlLocales as readonly string[]).includes(locale) ? "rtl" : "ltr"

export type Locale = {
  code: string
  name: string
}

export const localeLabels: Record<AppLocale, string> = {
  ar: "العربية",
  bg: "Български",
  bn: "বাংলা",
  cs: "Čeština",
  da: "Dansk",
  de: "Deutsch",
  el: "Ελληνικά",
  en: "English",
  es: "Español",
  fi: "Suomi",
  fr: "Français",
  he: "עברית",
  hi: "हिन्दी",
  hu: "Magyar",
  id: "Bahasa Indonesia",
  it: "Italiano",
  ja: "日本語",
  ka: "ქართული",
  ko: "한국어",
  lt: "Lietuvių",
  mn: "Монгол",
  ms: "Bahasa Melayu",
  nb: "Norsk bokmål",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
  ro: "Română",
  ru: "Русский",
  sk: "Slovenčina",
  sv: "Svenska",
  th: "ไทย",
  tl: "Tagalog",
  tr: "Türkçe",
  uk: "Українська",
  vi: "Tiếng Việt",
  zh: "中文",
}

export const appLocales: Locale[] = locales.map((code) => ({
  code,
  name: localeLabels[code],
}))

export function isAppLocale(
  value: string | null | undefined
): value is AppLocale {
  return !!value && locales.includes(value as AppLocale)
}

export function matchBrowserLocale(
  acceptLanguage: string | null | undefined
): AppLocale | undefined {
  if (!acceptLanguage) return undefined

  const primary = acceptLanguage
    .split(",")[0]
    .trim()
    .split(";")[0]
    .split("-")[0]
    .toLowerCase()

  return isAppLocale(primary) ? primary : undefined
}
