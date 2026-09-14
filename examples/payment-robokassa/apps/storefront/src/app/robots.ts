import { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"

const BASE_URL = getBaseURL().replace(/\/$/, "")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/account",
          "/*/checkout",
          "/*/cart",
          "/*/order/",
          "/*/reset-password",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
