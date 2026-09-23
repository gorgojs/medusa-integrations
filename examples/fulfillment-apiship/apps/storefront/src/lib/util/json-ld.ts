import type { HttpTypes } from "@medusajs/types"

import { getCategoryAncestors } from "@lib/util/category-ancestors"
import {
  getPricesForVariant,
  type VariantWithPrice,
} from "@lib/util/get-product-price"
import { SITE_NAME, getBaseURL } from "@lib/util/env"

const BASE = getBaseURL().replace(/\/$/, "")

/**
 * Fields Medusa has no column for. Set them on the product's `metadata` in
 * Admin, following the same convention as the SEO overrides:
 *
 *   brand      — manufacturer name; required by Google for merchant listings
 *   mpn        — manufacturer part number, used when there is no GTIN
 *   condition  — new | used | refurbished | damaged (defaults to new)
 */
const CONDITIONS: Record<string, string> = {
  new: "https://schema.org/NewCondition",
  used: "https://schema.org/UsedCondition",
  refurbished: "https://schema.org/RefurbishedCondition",
  damaged: "https://schema.org/DamagedCondition",
}

const IN_STOCK = "https://schema.org/InStock"
const OUT_OF_STOCK = "https://schema.org/OutOfStock"
const BACK_ORDER = "https://schema.org/BackOrder"

type JsonLdNode = Record<string, unknown>

/** Matches `BreadcrumbItem` from the breadcrumb component structurally. */
export type JsonLdCrumb = {
  label: string
  href?: string
}

/**
 * Absolute URL for a locale-scoped app path. Paths come from the same place
 * `<Link>` gets them, so they carry no locale prefix yet.
 */
export function localeUrl(locale: string, path: string) {
  const suffix = path === "/" ? "" : path
  return `${BASE}/${locale}${suffix}`
}

/** File-module URLs are absolute already; a local `/uploads/…` one is not. */
function assetUrl(src: string) {
  return /^https?:\/\//.test(src)
    ? src
    : `${BASE}${src.startsWith("/") ? "" : "/"}${src}`
}

function strMeta(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

/** Descriptions are rich text in Admin, and schema.org values are plain text. */
function stripHtml(value: string | null | undefined) {
  if (!value) return undefined
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text || undefined
}

function availability(variant: HttpTypes.StoreProductVariant) {
  // Inventory it does not track is inventory that never runs out.
  if (variant.manage_inventory === false) return IN_STOCK
  if ((variant.inventory_quantity ?? 0) > 0) return IN_STOCK
  return variant.allow_backorder ? BACK_ORDER : OUT_OF_STOCK
}

/** Pick the most specific identifier the variant carries, if any. */
function identifiers(variant: HttpTypes.StoreProductVariant): JsonLdNode {
  if (variant.ean) return { gtin13: variant.ean }
  if (variant.upc) return { gtin12: variant.upc }
  if (variant.barcode) return { gtin: variant.barcode }
  return {}
}

function buildOffer({
  variant,
  productUrl,
  condition,
}: {
  variant: VariantWithPrice
  productUrl: string
  condition: string
}): JsonLdNode | null {
  const price = getPricesForVariant(variant)

  if (!price) return null

  return {
    "@type": "Offer",
    url: `${productUrl}?v_id=${variant.id}`,
    price: price.calculated_price_number,
    priceCurrency: price.currency_code.toUpperCase(),
    availability: availability(variant),
    itemCondition: condition,
    ...(variant.sku ? { sku: variant.sku } : {}),
    ...identifiers(variant),
    seller: { "@type": "Organization", name: SITE_NAME },
  }
}

/** "Clothing > Shirts" — the trail a shopper sees in the breadcrumb. */
function categoryPath(product: HttpTypes.StoreProduct) {
  const category = product.categories?.[0]

  if (!category) return undefined

  return [...getCategoryAncestors(category), category]
    .map((entry) => entry.name)
    .join(" > ")
}

function buildBreadcrumbList(
  crumbs: JsonLdCrumb[],
  locale: string,
  id: string
): JsonLdNode | null {
  if (!crumbs.length) return null

  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      // The current page is the last crumb and links nowhere, which
      // schema.org allows for the trailing element only.
      ...(crumb.href ? { item: localeUrl(locale, crumb.href) } : {}),
    })),
  }
}

export function buildSiteJsonLd(locale: string): JsonLdNode {
  const organization: JsonLdNode = {
    "@type": "Organization",
    "@id": `${BASE}/#organization`,
    name: SITE_NAME,
    url: BASE,
  }

  const website: JsonLdNode = {
    "@type": "WebSite",
    "@id": `${BASE}/#website`,
    name: SITE_NAME,
    url: localeUrl(locale, "/"),
    inLanguage: locale,
    publisher: { "@id": `${BASE}/#organization` },
  }

  return {
    "@context": "https://schema.org",
    "@graph": [organization, website],
  }
}

export function buildBreadcrumbJsonLd({
  crumbs,
  locale,
  path,
}: {
  crumbs: JsonLdCrumb[]
  locale: string
  path: string
}): JsonLdNode | null {
  const node = buildBreadcrumbList(
    crumbs,
    locale,
    `${localeUrl(locale, path)}#breadcrumb`
  )

  if (!node) return null

  return {
    "@context": "https://schema.org",
    "@graph": [node],
  }
}

/**
 * `Product` plus one `Offer` per priced variant, and the page's
 * `BreadcrumbList`, as a single `@graph` so both nodes ship in one script tag.
 */
export function buildProductJsonLd({
  product,
  locale,
  breadcrumbs = [],
}: {
  product: HttpTypes.StoreProduct
  locale: string
  breadcrumbs?: JsonLdCrumb[]
}): JsonLdNode {
  const url = localeUrl(locale, `/products/${product.handle}`)
  const meta = (product.metadata ?? {}) as Record<string, unknown>
  const condition =
    CONDITIONS[strMeta(meta.condition)?.toLowerCase() ?? ""] ?? CONDITIONS.new

  const images = (
    product.images?.length
      ? product.images.map((image) => image.url)
      : [product.thumbnail]
  )
    .filter((src): src is string => !!src)
    .map(assetUrl)

  const offers = ((product.variants ?? []) as VariantWithPrice[])
    .map((variant) => buildOffer({ variant, productUrl: url, condition }))
    .filter((offer): offer is JsonLdNode => offer !== null)

  const brand = strMeta(meta.brand) ?? SITE_NAME
  const description = stripHtml(product.description ?? product.subtitle)
  const category = categoryPath(product)

  const productNode: JsonLdNode = {
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    url,
    inLanguage: locale,
    brand: { "@type": "Brand", name: brand },
    ...(description ? { description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(category ? { category } : {}),
    ...(product.material ? { material: product.material } : {}),
    ...(strMeta(meta.mpn) ? { mpn: strMeta(meta.mpn) } : {}),
    // A single offer stays an object: an array of one reads as a list of
    // choices to validators.
    ...(offers.length
      ? { offers: offers.length === 1 ? offers[0] : offers }
      : {}),
  }

  const breadcrumbNode = buildBreadcrumbList(
    breadcrumbs,
    locale,
    `${url}#breadcrumb`
  )

  return {
    "@context": "https://schema.org",
    "@graph": breadcrumbNode ? [productNode, breadcrumbNode] : [productNode],
  }
}
