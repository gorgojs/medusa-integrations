import { configureStoreSearch, defineMiddlewares } from "@medusajs/framework/http";

/**
 * Opens the product index to `POST /store/search`. The index declares
 * filterable `status` and `sales_channel_ids`, so the route narrows every query
 * to published products in the publishable key's sales channels on its own.
 */
export default defineMiddlewares({
  routes: [
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
  ],
});
