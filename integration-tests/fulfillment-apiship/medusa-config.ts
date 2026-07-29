import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "test", process.cwd())

const APISHIP_INTEGRATION_ID = "apiship-1"

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY || "test-secret",
        providers: [
          {
            resolve: "@gorgo/medusa-fulfillment-apiship/providers/integration-apiship",
            id: APISHIP_INTEGRATION_ID,
            options: {},
          },
        ],
      },
    },
    // Registered as its own plugin (not just referenced from `modules` below) so the
    // admin build discovers its admin extensions — i18n bundle (src/admin/i18n).
    // Without this entry the provider still works, but its admin UI never loads
    // and translation keys render raw (e.g. "apiship.name" instead of "ApiShip").
    {
      resolve: "@gorgo/medusa-fulfillment-apiship",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@gorgo/medusa-fulfillment-apiship/providers/fulfillment-apiship",
            id: "apiship",
            options: {
              id: APISHIP_INTEGRATION_ID, // must match the provider id used in the integration module above
            },
          },
        ],
      },
    },
  ],
})
