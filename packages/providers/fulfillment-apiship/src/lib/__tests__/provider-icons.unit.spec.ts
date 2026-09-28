import {
  APISHIP_DEFAULT_PROVIDER_ICON,
  APISHIP_PROVIDER_ICONS,
} from "../../data/provider-icons"
import { getApishipProviderIcon } from "../provider-icons"

const decode = (dataUri: string) => {
  const prefix = "data:image/svg+xml,"
  expect(dataUri.startsWith(prefix)).toBe(true)
  return decodeURIComponent(dataUri.slice(prefix.length))
}

describe("getApishipProviderIcon", () => {
  it("returns the provider's own logo as an SVG data URI", () => {
    expect(decode(getApishipProviderIcon("cdek"))).toBe(APISHIP_PROVIDER_ICONS.cdek)
  })

  it("falls back to the ApiShip default icon for an unknown or missing key", () => {
    expect(decode(getApishipProviderIcon("unknown-carrier"))).toBe(APISHIP_DEFAULT_PROVIDER_ICON)
    expect(decode(getApishipProviderIcon(undefined))).toBe(APISHIP_DEFAULT_PROVIDER_ICON)
    expect(decode(getApishipProviderIcon(""))).toBe(APISHIP_DEFAULT_PROVIDER_ICON)
  })

  it("gives both Ozon services the same logo", () => {
    expect(getApishipProviderIcon("ozondel")).toBe(getApishipProviderIcon("ozonlog"))
  })

  it.each(Object.entries({ ...APISHIP_PROVIDER_ICONS, default: APISHIP_DEFAULT_PROVIDER_ICON }))(
    "%s is a self-contained square SVG",
    (_key, svg) => {
      expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]* width="64" height="64" viewBox="0 0 64 64"/)
      expect(svg.endsWith("</svg>")).toBe(true)
      expect(svg).not.toMatch(/(?:href|src)="https?:/)
    }
  )
})
