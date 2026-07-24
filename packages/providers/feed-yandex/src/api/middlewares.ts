import { defineMiddlewares } from "@medusajs/framework/http"
import { adminFeedsRoutesMiddlewares } from "./admin/feeds/middlewares"
import { adminFeedByIdMiddlewares } from "./admin/feeds/[id]/middlewares"

export default defineMiddlewares({
  routes: [
    ...adminFeedsRoutesMiddlewares,
    ...adminFeedByIdMiddlewares,
  ],
})