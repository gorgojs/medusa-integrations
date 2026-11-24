import "server-only"
import {
  COOKIE_NAMES,
  pendingCookieOpts,
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

export type PendingCustomer = {
  first_name?: string
  last_name?: string
  phone?: string
  locale?: string
}

/**
 * When the backend requires email verification, the customer record can only
 * be created after the customer confirms their email and signs in. The sign-up
 * fields wait here meanwhile, so they survive the trip to the inbox.
 */
export const setPendingCustomer = async (customer: PendingCustomer) => {
  const cookies = await nextCookies()
  cookies.set(
    COOKIE_NAMES.pendingCustomer,
    JSON.stringify(customer),
    pendingCookieOpts
  )
}

export const getPendingCustomer = async (): Promise<PendingCustomer | null> => {
  const cookies = await nextCookies()
  const value = cookies.get(COOKIE_NAMES.pendingCustomer)?.value

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as PendingCustomer
  } catch {
    return null
  }
}

export const removePendingCustomer = async () => {
  const cookies = await nextCookies()
  cookies.set(COOKIE_NAMES.pendingCustomer, "", {
    ...pendingCookieOpts,
    maxAge: -1,
  })
}

/**
 * Medusa issues a new confirmation token on every request and voids the last
 * one, so asking again while the first email is on its way would break its
 * link. The address the last request went for is remembered for five minutes.
 */
const VERIFICATION_RESEND_SECONDS = 60 * 5

export const wasVerificationRequested = async (email: string) => {
  const cookies = await nextCookies()
  return cookies.get(COOKIE_NAMES.verificationRequested)?.value === email
}

export const setVerificationRequested = async (email: string) => {
  const cookies = await nextCookies()
  cookies.set(COOKIE_NAMES.verificationRequested, email, {
    ...privateCookieOpts,
    maxAge: VERIFICATION_RESEND_SECONDS,
  })
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
