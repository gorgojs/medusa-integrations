import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import type { HttpTypes } from "@medusajs/types"

import InteractiveLink from "@modules/common/components/interactive-link"
import ProductPreview from "@modules/products/components/product-preview"
import { getTranslations } from "next-intl/server"

export default async function ProductRail({
  region,
}: {
  region: HttpTypes.StoreRegion
}) {
  const t = await getTranslations()
  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections?.length) {
    return null
  }

  const collectionsWithProducts = await Promise.all(
    collections.map(async (collection) => {
      const {
        response: { products },
      } = await listProducts({
        regionId: region.id,
        queryParams: {
          collection_id: collection.id,
          fields: "*variants.calculated_price",
          limit: 4,
        },
      })

      return { collection, products }
    })
  )

  return collectionsWithProducts
    .filter(({ products }) => products.length > 0)
    .map(({ collection, products }) => (
      <li key={collection.id} className="content-container py-12 small:py-24">
        <div className="mb-8 flex items-center justify-between gap-4 small:grid small:grid-cols-3">
          <div className="hidden small:block" />
          <h2 className="h3-webs text-start small:text-center">
            {collection.title}
          </h2>
          <div className="flex justify-end">
            <InteractiveLink href={`/collections/${collection.handle}`}>
              {t("ProductRail.viewAll")}
            </InteractiveLink>
          </div>
        </div>
        <ul className="grid grid-cols-2 small:grid-cols-4 gap-x-2 small:gap-x-6 gap-y-24 small:gap-y-36">
          {products.map((product) => (
            <li key={product.id}>
              <ProductPreview product={product} region={region} isFeatured />
            </li>
          ))}
        </ul>
      </li>
    ))
}
