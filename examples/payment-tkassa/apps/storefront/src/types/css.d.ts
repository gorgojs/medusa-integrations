/**
 * Plain CSS side-effect imports. Next compiles them, but `next/types/global.d.ts`
 * declares only `*.module.css`, so a bare `import "pkg/dist/styles.css"` has
 * nothing for editors and linters to resolve. The more specific `*.module.css`
 * pattern still wins for CSS modules.
 */
declare module "*.css"
