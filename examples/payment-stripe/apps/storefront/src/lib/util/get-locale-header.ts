import { getLocale } from "next-intl/server"

export async function getLocaleHeader() {
  try {
    const locale = await getLocale()
    return { "x-medusa-locale": locale } as const
  } catch {
    return { "x-medusa-locale": null } as const
  }
}
