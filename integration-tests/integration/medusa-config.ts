import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import path from "path"

loadEnv(process.env.NODE_ENV || "test", process.cwd())

// Full-app config for the http-level tests (medusaIntegrationTestRunner): registers the
// integration plugin with the local fake provider (same one the module tests use).
const TEST_PROVIDER = require.resolve(path.join(__dirname, "__tests__/utils/test-provider"))

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
    cookieOptions: { sameSite: "lax", secure: false },
  },
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY || "supersecret",
        providers: [
          { resolve: TEST_PROVIDER, id: "a", options: {} },
          { resolve: TEST_PROVIDER, id: "b", options: {} },
        ],
      },
    },
  ],
})
