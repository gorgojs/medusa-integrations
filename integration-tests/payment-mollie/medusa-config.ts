import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "test", process.cwd())

const MOLLIE_INTEGRATION_ID = "mollie-1"

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
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY || "supersecret",
        providers: [
          {
            resolve: "@gorgo/medusa-payment-mollie/providers/integration-mollie",
            id: MOLLIE_INTEGRATION_ID,
            options: {},
          },
        ],
      },
    },
    {
      resolve: "@gorgo/medusa-payment-mollie",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@gorgo/medusa-payment-mollie/providers/payment-mollie",
            id: "mollie",
            options: {
              // must match the provider id used in the integration module above
              id: MOLLIE_INTEGRATION_ID,
            },
          },
        ],
      },
    },
  ],
})
