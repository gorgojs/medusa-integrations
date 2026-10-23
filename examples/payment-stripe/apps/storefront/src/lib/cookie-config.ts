/**
 * Cookie names and attribute presets shared by the middleware, the server
 * actions in @lib/data and the client components that read the same cookies.
 *
 * Keep this module free of "server-only" and next/headers imports — the
 * middleware runs on the edge runtime and the promo banner is a client
 * component, and both need these names.
 */

const DAY = 60 * 60 * 24

export const COOKIE_NAMES = {
  authToken: "_medusa_jwt",
  cacheId: "_medusa_cache_id",
  cartId: "_medusa_cart_id",
  country: "_medusa_country",
  locale: "_medusa_locale",
  promoBannerDismissed: "_promo_banner_dismissed",
} as const

const secure = process.env.NODE_ENV === "production"

// "lax" everywhere, so a cookie still reaches us on a top-level navigation
// coming back from an external site (payment provider redirects). "strict"
// would drop it on that first request and the order confirmation page would
// see a guest with no cart and the default locale.
const sameSite = "lax" as const

/** Cookies only the server reads back — auth token, cart id. */
export const privateCookieOpts = {
  maxAge: DAY * 7,
  httpOnly: true,
  sameSite,
  secure,
}

/** Long-lived preferences the client reads too — locale, country. */
export const persistentCookieOpts = {
  maxAge: DAY * 365,
  httpOnly: false,
  sameSite,
  secure,
}
