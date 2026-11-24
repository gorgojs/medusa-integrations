import {
  allowFields,
  configureStoreSearch,
  defineMiddlewares,
} from "@medusajs/framework/http";

export default defineMiddlewares({
  routes: [
    /**
     * Opens the product index to `POST /store/search`. The index declares
     * filterable `status` and `sales_channel_ids`, so the route narrows every query
     * to published products in the publishable key's sales channels on its own.
     */
    {
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    /**
     * The storefront reads a product's category trail (the breadcrumb) and an
     * option value's metadata (the colour swatch) from `GET /store/products`.
     * Since Medusa 2.21 the route keeps an allowlist of fields and silently drops
     * a requested field that is not on it, so these are re-exposed here. The
     * entry names no method on purpose: a method-less entry runs before the
     * route's own validator, which is where the allowance has to be in place.
     */
    {
      matcher: "/store/products",
      middlewares: [
        allowFields(
          "categories.parent_category",
          "categories.parent_category.parent_category",
          "options.values.metadata",
          "variants.options.option_id",
        ),
      ],
    },
  ],
});
