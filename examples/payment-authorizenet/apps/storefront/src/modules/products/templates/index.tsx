import type React from "react"
import { Suspense } from "react"
import { getLocale, getTranslations } from "next-intl/server"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import Breadcrumb, {
  type BreadcrumbItem,
} from "@modules/common/components/breadcrumb"
import JsonLd from "@modules/common/components/json-ld"
import { buildProductJsonLd } from "@lib/util/json-ld"
import { notFound } from "next/navigation"
import type { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate: React.FC<ProductTemplateProps> = async ({
  product,
  region,
  countryCode,
  images,
}) => {
  const [t, locale] = await Promise.all([getTranslations(""), getLocale()])

  if (!product || !product.id) {
    return notFound()
  }

  let rootCategory = product.categories?.[0]
  while (rootCategory?.parent_category) {
    rootCategory = rootCategory.parent_category
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t("Breadcrumb.home"), href: "/" },
    { label: t("Breadcrumb.store"), href: "/store" },
    ...(rootCategory
      ? [
          {
            label: rootCategory.name,
            href: `/categories/${rootCategory.handle}`,
          },
        ]
      : []),
    { label: product.title },
  ]

  const jsonLd = buildProductJsonLd({
    product,
    locale,
    breadcrumbs: breadcrumbItems,
  })

  return (
    <>
      <JsonLd data={jsonLd} />

      <div
        className="content-container flex flex-col gap-y-6 py-6"
        data-testid="product-container"
      >
        <Breadcrumb items={breadcrumbItems} />

        <div className="flex flex-col small:flex-row gap-x-8 items-start">
          <div className="flex-1 w-full">
            <ImageGallery images={images} />
          </div>

          <div className="flex flex-col small:sticky small:top-20 small:w-[320px] w-full gap-y-6 py-8 small:py-0 shrink-0">
            <ProductInfo product={product} />
            <ProductOnboardingCta />
            <Suspense
              fallback={
                <ProductActions
                  disabled={true}
                  product={product}
                  region={region}
                />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>
            <ProductTabs product={product} />
          </div>
        </div>
      </div>

      <div
        className="content-container my-16 small:my-32"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
