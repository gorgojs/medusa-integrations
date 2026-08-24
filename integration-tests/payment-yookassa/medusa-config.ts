import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "test", process.cwd())

const YOOKASSA_INTEGRATION_ID = "yookassa-1";

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY || "supersecret",
        providers: [
          {
            resolve: "@gorgo/medusa-payment-yookassa/providers/integration-yookassa",
            options: {
              id: YOOKASSA_INTEGRATION_ID, // must match the provider id used in the payment module below
            },
          },
        ],
      },
    },
    {
      resolve: "@gorgo/medusa-payment-yookassa",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@gorgo/medusa-payment-yookassa/providers/payment-yookassa",
            id: "yookassa",
            options: {
              id: YOOKASSA_INTEGRATION_ID, // must match the provider id used in the integration module above
            },
          },
        ],
      },
    },
  ],
})
