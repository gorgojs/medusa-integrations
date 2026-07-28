const { loadEnv } = require("@medusajs/utils")
loadEnv("test", process.cwd())

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
  rootDir: __dirname,
  transform: {
    "^.+\\.[jt]s$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", decorators: true },
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
  transformIgnorePatterns: [
    `/node_modules/(?!(${esmPackagesToTransform.join("|")})/)`,
  ],
}

if (process.env.TEST_TYPE === "integration:modules") {
  module.exports = {
    ...baseConfig,
    testMatch: ["**/__tests__/modules/*.spec.[jt]s"],
    setupFiles: ["./setup.js"],
  }
} else {
  module.exports = {
    ...baseConfig,
    testMatch: ["**/__tests__/http/*.spec.[jt]s"],
    setupFiles: ["./setup.js"],
  }
}
