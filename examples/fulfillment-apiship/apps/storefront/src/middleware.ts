import { isAppLocale, defaultLocale, matchBrowserLocale } from "@i18n/config"
import { resolveCountry, type RegionMap } from "@lib/geolocation"
import type { HttpTypes } from "@medusajs/types"
import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const LOCALE_COOKIE = "_medusa_locale"

const INTL_LOCALE_HEADER = "X-NEXT-INTL-LOCALE"

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (!BACKEND_URL) {
    throw new Error(
      "Middleware.ts: Error fetching regions. Did you set up regions in your Medusa Admin and define a NEXT_PUBLIC_MEDUSA_BACKEND_URL environment variable."
    )
  }

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    const response = await fetch(`${BACKEND_URL}/store/regions?limit=1000`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
      cache: "force-cache",
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const { regions } = await response.json()

    if (!regions?.length) {
      return new Map<string, HttpTypes.StoreRegion>()
    }

    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2 ?? "", region)
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cacheId = cacheIdCookie?.value || crypto.randomUUID()
  const regionMap: RegionMap = await getRegionMap(cacheId)

  // Region detection is owned by @lib/geolocation. It reads the visitor's
  // country from the _medusa_country cookie, or resolves it through the
  // configured geolocation provider, and returns a function that writes the
  // cookie (plus the x-geo-* debug headers) onto the response we return below.
  const applyCountry = await resolveCountry(request, regionMap)

  const segments = request.nextUrl.pathname.split("/").filter(Boolean)
  const firstSegment = segments[0]
  const hasLocaleInUrl = firstSegment && isAppLocale(firstSegment)

  const persistentCookieOpts = {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  }

  function withCookies(res: NextResponse, locale: string): NextResponse {
    if (!cacheIdCookie) {
      res.cookies.set("_medusa_cache_id", cacheId, { maxAge: 60 * 60 * 24 })
    }
    res.cookies.set(LOCALE_COOKIE, locale, persistentCookieOpts)
    return applyCountry(res)
  }

  if (hasLocaleInUrl) {
    const locale = firstSegment

    // Every page under /account beyond the entry point belongs to a signed-in
    // customer, and the account layout only renders the sign-in form for
    // /account itself. Send a signed-out visitor there rather than letting the
    // parallel route fall through to a 404.
    if (
      segments[1] === "account" &&
      segments.length > 2 &&
      !request.cookies.get("_medusa_jwt")
    ) {
      const res = NextResponse.redirect(
        new URL(`/${locale}/account`, request.url)
      )
      return withCookies(res, locale)
    }

    const res = NextResponse.next()
    res.headers.set(INTL_LOCALE_HEADER, locale)
    return withCookies(res, locale)
  }

  // No locale in URL — detect and redirect 302
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value

  const locale =
    cookieLocale && isAppLocale(cookieLocale)
      ? cookieLocale
      : (matchBrowserLocale(request.headers.get("accept-language")) ??
        defaultLocale)

  const trailingPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
  const redirectUrl = new URL(`/${locale}${trailingPath}${request.nextUrl.search}`, request.url)
  const res = NextResponse.redirect(redirectUrl, 302)
  return withCookies(res, locale)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
