import { DEFAULT_REGION } from "@lib/util/env"
import type { HttpTypes } from "@medusajs/types"
import type { NextRequest, NextResponse } from "next/server"
import { detectCountry } from "./detect"

export const COUNTRY_COOKIE = "_medusa_country"

const RESOLVED_MAX_AGE = 60 * 60 * 24 * 365
const UNRESOLVED_MAX_AGE = 60 * 5
const DEBUG = process.env.GEOLOCATION_DEBUG === "true"

export type RegionMap = Map<string, HttpTypes.StoreRegion>

export type ApplyCountry = (res: NextResponse) => NextResponse

type Resolution = {
  countryCode: string
  resolved: boolean
  source: string
  detected: string | null
  provider: string
  ip: string
}

const fromCookie = (countryCode: string): Resolution => ({
  countryCode,
  resolved: true,
  source: "cookie",
  detected: null,
  provider: "none",
  ip: "none",
})

const resolve = async (
  request: NextRequest,
  regionMap: RegionMap
): Promise<Resolution> => {
  const existing = request.cookies.get(COUNTRY_COOKIE)?.value

  if (existing && regionMap.has(existing)) {
    return fromCookie(existing)
  }

  const { countryCode: detected, provider, ip } = await detectCountry(request)
  const base = { detected, provider, ip }

  if (detected && regionMap.has(detected)) {
    return { ...base, countryCode: detected, resolved: true, source: "detected" }
  }

  const suffix = detected ? "-no-region" : ""

  if (regionMap.has(DEFAULT_REGION)) {
    return {
      ...base,
      countryCode: DEFAULT_REGION,
      resolved: false,
      source: `fallback-default${suffix}`,
    }
  }

  return {
    ...base,
    countryCode: regionMap.keys().next().value ?? DEFAULT_REGION,
    resolved: false,
    source: `fallback-first${suffix}`,
  }
}

export const resolveCountry = async (
  request: NextRequest,
  regionMap: RegionMap
): Promise<ApplyCountry> => {
  const resolution = await resolve(request, regionMap)

  return (res) => {
    res.cookies.set(COUNTRY_COOKIE, resolution.countryCode, {
      maxAge: resolution.resolved ? RESOLVED_MAX_AGE : UNRESOLVED_MAX_AGE,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    if (DEBUG) {
      res.headers.set("x-geo-source", resolution.source)
      res.headers.set("x-geo-country", resolution.countryCode)
      res.headers.set("x-geo-detected", resolution.detected ?? "none")
      res.headers.set("x-geo-provider", resolution.provider)
      res.headers.set("x-geo-client-ip", resolution.ip)
    }

    return res
  }
}
