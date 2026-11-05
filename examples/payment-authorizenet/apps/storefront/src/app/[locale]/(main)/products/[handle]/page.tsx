import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { buildAlternates } from "@lib/util/alternates"
import { getCountryCode } from "@lib/data/cookies"
import ProductTemplate from "@modules/products/templates"
import type { HttpTypes } from "@medusajs/types"
import { getLocale } from "next-intl/server"
import { DEFAULT_REGION, SITE_NAME } from "@lib/util/env"
import { metaDescription } from "@lib/util/meta-description"
import { pageTitle } from "@lib/util/page-title"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
  return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const [params, countryCode, locale] = await Promise.all([
    props.params,
    getCountryCode(),
    getLocale(),
  ])

  const cc = countryCode ?? DEFAULT_REGION
  const { handle } = params
  const region = await getRegion(cc)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: cc,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  const title = product.title ? pageTitle(product.title) : SITE_NAME

  const description = metaDescription(product.description, product.subtitle)

  return {
    title,
    description,
    alternates: buildAlternates(locale, `/products/${handle}`),
    openGraph: {
      title,
      description,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const [params, countryCode, searchParams] = await Promise.all([
    props.params,
    getCountryCode(),
    props.searchParams,
  ])

  const cc = countryCode ?? DEFAULT_REGION
  const region = await getRegion(cc)
  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: cc,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={cc}
      images={images ?? []}
    />
  )
}
