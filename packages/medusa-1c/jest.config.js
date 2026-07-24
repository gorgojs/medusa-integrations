const { loadEnv } = require("@medusajs/utils")
loadEnv("test", process.cwd())

const baseConfig = {
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
  },
  testEnvironment: "node",
  moduleFileExtensions: ["js", "mjs", "ts", "json"],
  modulePathIgnorePatterns: ["dist/", "<rootDir>/.medusa/"],
}

module.exports = {
  ...baseConfig,
  testMatch: ["**/src/**/__tests__/**/*.unit.spec.[jt]s"],
}
