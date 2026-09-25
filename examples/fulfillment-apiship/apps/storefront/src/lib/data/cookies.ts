import "server-only"
import {
  COOKIE_NAMES,
  persistentCookieOpts,
  privateCookieOpts,
} from "@lib/cookie-config"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | Record<string, never>
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get(COOKIE_NAMES.authToken)?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get(COOKIE_NAMES.cacheId)?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | Record<string, never>> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set(COOKIE_NAMES.authToken, token, privateCookieOpts)
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set(COOKIE_NAMES.authToken, "", { ...privateCookieOpts, maxAge: -1 })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get(COOKIE_NAMES.cartId)?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set(COOKIE_NAMES.cartId, cartId, privateCookieOpts)
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set(COOKIE_NAMES.cartId, "", { ...privateCookieOpts, maxAge: -1 })
}

export const getPromoBannerDismissed = async (): Promise<boolean> => {
  try {
    const cookies = await nextCookies()
    return cookies.get(COOKIE_NAMES.promoBannerDismissed)?.value === "1"
  } catch {
    return false
  }
}

export const getCountryCode = async (): Promise<string | null> => {
  try {
    const cookies = await nextCookies()
    return cookies.get(COOKIE_NAMES.country)?.value ?? null
  } catch {
    return null
  }
}

export const setCountryCode = async (countryCode: string) => {
  const cookies = await nextCookies()
  cookies.set(COOKIE_NAMES.country, countryCode, persistentCookieOpts)
}
