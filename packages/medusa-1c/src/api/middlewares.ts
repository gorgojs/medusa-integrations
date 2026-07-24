import { defineMiddlewares } from "@medusajs/framework/http";
import bodyParser from "body-parser";

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/1c/exchange",
      middlewares: [
        bodyParser.raw({
          type: () => true,
          limit: "500mb",
        }),
      ],
    },
  ],
});
