import type { Metadata } from "next"
import { Suspense } from "react"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { buildAlternates } from "@lib/util/alternates"
import { getTranslations, getLocale } from "next-intl/server"
import { SITE_NAME } from "@lib/util/env"

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations("Metadata.home"),
    getLocale(),
  ])
  return {
    title: SITE_NAME,
    description: t("description"),
    alternates: buildAlternates(locale, "/"),
  }
}

export default function Home() {
  // Nothing is awaited before <Hero />: the LCP element is the hero <h1>, and
  // any await here holds back the whole document body, which shows up as LCP
  // "element render delay". The product rail streams in behind a boundary.
  return (
    <>
      <Hero />
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <Suspense
            fallback={
              <li className="content-container py-12 small:py-24">
                <SkeletonProductGrid numberOfProducts={4} />
              </li>
            }
          >
            <FeaturedProducts />
          </Suspense>
        </ul>
      </div>
    </>
  )
}
