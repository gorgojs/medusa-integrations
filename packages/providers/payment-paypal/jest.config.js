const { loadEnv } = require("@medusajs/utils")
loadEnv("test", process.cwd())

/**
 * MSW v2 ships several ESM-only dependencies (rettime, @bundled-es-modules/*,
 * until-async, outvariant, strict-event-emitter, etc). Jest does not transform
 * `node_modules` by default, so we explicitly whitelist these packages so the
 * SWC transformer can compile them down to CJS.
 */
const esmPackagesToTransform = [
  "msw",
  "@mswjs",
  "@bundled-es-modules",
  "rettime",
  "until-async",
  "outvariant",
  "strict-event-emitter",
  "is-node-process",
  "headers-polyfill",
  "@open-draft",
]

const baseConfig = {
  transform: {
    "^.+\\.[jt]s$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
          // Pin target to match tsconfig — recent @swc/jest defaults to es2023
          // which the pinned @swc/core (1.5.7) doesn't support.
          target: "es2021",
        },
      },
    ],
    "^.+\\.mjs$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "ecmascript" },
          target: "es2021",
        },
        module: { type: "commonjs" },
      },
    ],
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "mjs", "ts", "json"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
  moduleNameMapper: {
    "(?:^|/)paypal-orders-client$":
      "<rootDir>/src/lib/__mocks__/paypal-orders-client.ts",
    "(?:^|/)paypal-payments-client$":
      "<rootDir>/src/lib/__mocks__/paypal-payments-client.ts",
    "(?:^|/)paypal-webhooks-client$":
      "<rootDir>/src/lib/__mocks__/paypal-webhooks-client.ts",
  },
  transformIgnorePatterns: [
    `/node_modules/(?!(${esmPackagesToTransform.join("|")})/)`,
  ],
}

module.exports = {
  ...baseConfig,
  testMatch: ["**/src/**/__tests__/**/*.unit.spec.[jt]s"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/__tests__/**",
    "!src/**/__mocks__/**",
    "!src/admin/**",
    "!src/lib/paypal-*-client/**",
  ],
  coverageThreshold: { global: { lines: 80 } },
}
