import medusa from "@medusajs/eslint-plugin";

/**
 * `medusa lint` finds this file through ESLint's own config resolution, and so
 * do `medusa build` and `medusa develop`, which run the same check. `develop`
 * refuses to start on a lint error, so keep this project clean.
 *
 * `.mjs` rather than `.ts` on purpose: a TypeScript config would pull in `jiti`
 * only to read four lines.
 */
export default [
  {
    ignores: [
      ".medusa/**",
      "dist/**",
      "node_modules/**",
      "src/migration-scripts/data/**",
    ],
  },
  ...medusa.configs.recommended,
  {
    /**
     * `use-medusa-error-not-generic-error` exists so a thrown error maps onto
     * the right HTTP status. Neither of these paths serves a request: the seed
     * stages run through `medusa exec`, and `scripts/` runs as plain Node after
     * `medusa build`. A generic `Error` is the correct thing to throw there.
     */
    files: ["scripts/**/*.js", "src/migration-scripts/**/*.ts"],
    rules: { "@medusajs/use-medusa-error-not-generic-error": "off" },
  },
];
