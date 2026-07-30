import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { optional } from 'zod'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

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
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        // Any non-empty secret (SHA-256-derived to a 32-byte key). Required in dev and prod;
        // high-entropy recommended, e.g. `openssl rand -hex 32`.
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY,
        providers: [
          {
            // Each registration = one integration instance, keyed by `int_<identifier>[_<id>]`.
            // Omit `id` for the single/default instance → key `int_tkassa`, stored as
            // (plugin_id="tkassa", instance_id=null).
            resolve: "@gorgo/medusa-integration-sandbox/providers/integration-tkassa",
            id: "tkassa",
            options: {},
          },
          // Multi-instance: register the SAME class once per account, each with a distinct
          // `id`. The consuming provider must be registered with a matching `options.id`
          // so it resolves the right instance (see the payment module below).
          {
            resolve: "@gorgo/medusa-integration-sandbox/providers/integration-tkassa",
            id: "acct2", // → key int_tkassa_acct2, stored as instance_id="acct2"
            options: {},
          },
          {
            resolve: "@gorgo/medusa-1c/providers/integration-1c",
            options: {},
          }
        ],
      },
    },
    {
      resolve: "@gorgo/medusa-integration-sandbox",
      options: {}
    },
    {
      resolve: "@gorgo/medusa-1c",
      options: {}
    }
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@gorgo/medusa-integration-sandbox/providers/payment-tkassa",
            id: "tkassa",
            options: {
              id: "tkassa"
            }
          },
          {
            resolve: "@gorgo/medusa-integration-sandbox/providers/payment-tkassa",
            id: "acct2",
            options: {
              id: "acct2" // → reads integration instance int_tkassa_acct2
            },
          },
        ],
      },
    },
  ],
})
