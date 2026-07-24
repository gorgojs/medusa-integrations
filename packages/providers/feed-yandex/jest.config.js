const { loadEnv } = require("@medusajs/utils")
loadEnv("test", process.cwd())

module.exports = {
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
  testMatch: ["**/src/**/__tests__/**/*.unit.spec.[jt]s"],
}
