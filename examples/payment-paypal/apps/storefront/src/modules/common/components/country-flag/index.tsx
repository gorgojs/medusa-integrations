"use client"

import { useState } from "react"
import ReactCountryFlag from "react-country-flag"

/**
 * Flags for the seeded regions are vendored under `public/flags/4x3/`, so the
 * common case is a same-origin request with a one-year immutable cache. A
 * country code that isn't vendored falls back to the CDN — pinned to a tag,
 * because the unpinned `gh/lipis/flag-icons` path is only cached for 7 days.
 */
const LOCAL_CDN_URL = "/flags/4x3/"
const FALLBACK_CDN_URL =
  "https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.5.0/flags/4x3/"

type CountryFlagProps = {
  countryCode: string
  className?: string
  style?: React.CSSProperties
}

export default function CountryFlag({
  countryCode,
  className,
  style,
}: CountryFlagProps) {
  const [missingCode, setMissingCode] = useState<string | null>(null)

  return (
    <ReactCountryFlag
      svg
      alt=""
      cdnUrl={missingCode === countryCode ? FALLBACK_CDN_URL : LOCAL_CDN_URL}
      countryCode={countryCode}
      className={className}
      style={style}
      onError={() => setMissingCode(countryCode)}
    />
  )
}
