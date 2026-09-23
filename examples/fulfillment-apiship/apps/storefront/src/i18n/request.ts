import { getRequestConfig } from "next-intl/server"
import { hasLocale } from "next-intl"
import { cookies } from "next/headers"
import { routing } from "./routing"

const LOCALE_COOKIE_NAME = "_medusa_locale"

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale

  let locale: string
  if (requested && hasLocale(routing.locales, requested)) {
    locale = requested
  } else {
    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value
    locale =
      cookieLocale && hasLocale(routing.locales, cookieLocale)
        ? cookieLocale
        : routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
