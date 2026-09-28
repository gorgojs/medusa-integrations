import {
  APISHIP_DEFAULT_PROVIDER_ICON,
  APISHIP_PROVIDER_ICONS,
} from "../data/provider-icons"

const toSvgDataUri = (svg: string) =>
  `data:image/svg+xml,${encodeURIComponent(svg)}`

const PROVIDER_ICONS = new Map(
  Object.entries(APISHIP_PROVIDER_ICONS).map(([key, svg]) => [
    key,
    toSvgDataUri(svg),
  ])
)

const DEFAULT_PROVIDER_ICON = toSvgDataUri(APISHIP_DEFAULT_PROVIDER_ICON)

export const getApishipProviderIcon = (providerKey?: string): string =>
  (providerKey && PROVIDER_ICONS.get(providerKey)) || DEFAULT_PROVIDER_ICON
