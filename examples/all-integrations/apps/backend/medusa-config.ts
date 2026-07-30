import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const TKASSA_INTEGRATION_ID = "tkassa-1";
const YOOKASSA_INTEGRATION_ID = "yookassa-1";
const ROBOKASSA_INTEGRATION_ID = "robokassa-1";
const ONEC_INTEGRATION_ID = "1c-1"
const APISHIP_INTEGRATION_ID = "apiship-1"

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
    cookieOptions: {
      sameSite: "lax",
      secure: false,
    }
  },
  admin: {
    vite: () => {
      return {
        server: {
          allowedHosts: true,
        },
      }
    },
  },
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY,
        providers: [
          {
            resolve: "@gorgo/medusa-fulfillment-apiship/providers/integration-apiship",
            id: APISHIP_INTEGRATION_ID,
            options: {},
          },
          {
            resolve: "@gorgo/medusa-payment-tkassa/providers/integration-tkassa",
            id: TKASSA_INTEGRATION_ID,
            options: {},
          },
          {
            resolve: "@gorgo/medusa-payment-yookassa/providers/integration-yookassa",
            id: YOOKASSA_INTEGRATION_ID,
            options: {},
          },
          {
            resolve: "@gorgo/medusa-payment-robokassa/providers/integration-robokassa",
            id: ROBOKASSA_INTEGRATION_ID,
            options: {},
          },
          {
            resolve: "@gorgo/medusa-1c/providers/integration-1c",
            id: ONEC_INTEGRATION_ID,
            options: {},
          },
        ],
      },
    },
    // Registered as its own plugins (not just referenced from `modules` below) so the
    // admin build discovers its admin extensions — i18n bundle (src/admin/i18n).
    // Without this entry the provider still works, but its admin UI never loads
    // and translation keys render raw (e.g. "provider.name" instead of "My Provider").  
    {
      resolve: "@gorgo/medusa-fulfillment-apiship",
      options: {},
    },
    {
      resolve: "@gorgo/medusa-payment-tkassa",
      options: {},
    },
    {
      resolve: "@gorgo/medusa-payment-yookassa",
      options: {},
    },
    {
      resolve: "@gorgo/medusa-payment-tkassa",
      options: {},
    },
    {
      resolve: "@gorgo/medusa-payment-robokassa",
      options: {},
    },
    {
      resolve: "@gorgo/medusa-1c",
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
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@gorgo/medusa-payment-tkassa/providers/payment-tkassa",
            id: "tkassa",
            options: {
              id: TKASSA_INTEGRATION_ID // must match the provider id used in the integration module above
            },
          },
          {
            resolve: "@gorgo/medusa-payment-yookassa/providers/payment-yookassa",
            id: "yookassa",
            options: {
              id: YOOKASSA_INTEGRATION_ID // must match the provider id used in the integration module above
            },
          },
          {
            resolve: "@gorgo/medusa-payment-robokassa/providers/payment-robokassa",
            id: "robokassa",
            options: {
              id: ROBOKASSA_INTEGRATION_ID // must match the provider id used in the integration module above
            },
          },
        ],
      },
    },
  ],
})
