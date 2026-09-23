import { defaultLocale } from "@i18n/config"
import { getCountryCode } from "@lib/data/cookies"
import { getRegion } from "@lib/data/regions"
import ProductRail from "@modules/home/components/featured-products/product-rail"

// Resolves its own region instead of taking it as a prop: the page renders this
// inside a <Suspense> boundary, so keeping the region fetch in here means the
// hero HTML flushes without waiting on /store/regions.
export default async function FeaturedProducts() {
  const countryCode = await getCountryCode()
  const region = await getRegion(countryCode ?? defaultLocale)

  if (!region) {
    return null
  }

  return <ProductRail region={region} />
}
