import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const APISHIP_INTEGRATION_ID = "apiship-1"

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  featureFlags: {
    backend_hm: true
  },
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        // Any non-empty secret (SHA-256-derived to a 32-byte key). Required in dev and prod;
        // high-entropy recommended, e.g. `openssl rand -hex 32`.
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY || "supersecret",
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
            }
          },
        ],
      },
    },
  ],
})
