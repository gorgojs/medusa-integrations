const path = require("path")
const checkEnvVariables = require("./check-env-variables")
const createNextIntlPlugin = require("next-intl/plugin")

const withNextIntl = createNextIntlPlugin()

checkEnvVariables()

/**
 * The Medusa version shown in the hero, read from the backend's package.json at
 * build time so the two cannot drift: the daily Update Medusa workflow bumps
 * that dependency, and the next build picks the new number up on its own.
 *
 * Left unset when apps/backend is not part of the checkout, for a storefront
 * copied out of the monorepo. The hero then drops the version segment, and
 * MEDUSA_VERSION can be passed in as a real environment variable instead.
 */
function readMedusaVersion() {
  try {
    const pkg = require(path.join(__dirname, "../backend/package.json"))
    const range = pkg.dependencies?.["@medusajs/medusa"]
    return range ? range.replace(/^[\^~]/, "") : undefined
  } catch {
    return undefined
  }
}

const MEDUSA_VERSION = readMedusaVersion()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "standalone",
  // Next streams metadata by default, which lands <title>, the description,
  // the canonical and every hreflang in the body instead of the head. React
  // never hoists them, so Google ignores a canonical it finds there and
  // Lighthouse, whose gatherer reads "head meta", scores the page as having no
  // description. Matching every user agent turns metadata back into part of
  // the head that ships with the shell.
  htmlLimitedBots: /.*/,
  // Inlined into the bundle at build time, so the hero never reads the
  // backend's package.json at runtime, which output: "standalone" would not
  // have traced into the deployed app anyway.
  env: {
    ...(MEDUSA_VERSION ? { MEDUSA_VERSION } : {}),
  },
  // Emit .map files for the client bundles so production stack traces and
  // Lighthouse diagnostics resolve to real source.
  productionBrowserSourceMaps: true,
  experimental: {
    // Rewrites barrel imports into per-component deep imports so the client
    // bundle only carries the primitives we actually use, not the whole kit.
    // "radix-ui" is a single barrel re-exporting every primitive; @medusajs/ui
    // imports from it in 22 places, so DropdownMenu alone dragged in Select,
    // NavigationMenu, Menu, ScrollArea and Toast.
    optimizePackageImports: ["@medusajs/ui", "@medusajs/icons", "radix-ui"],
    // Inlines the route's CSS into <style> in the HTML instead of a
    // render-blocking <link>. The stylesheet is small enough that the extra
    // HTML bytes cost less than the extra round trip.
    inlineCss: true,
  },
  async headers() {
    return [
      {
        // Vendored flag-icons SVGs are addressed by country code and never
        // change; public/ is otherwise served with max-age=0.
        source: "/flags/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
  // Required so Next standalone traces files from the pnpm workspace root
  outputFileTracingRoot: path.join(__dirname, "../../"),
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = withNextIntl(nextConfig)
