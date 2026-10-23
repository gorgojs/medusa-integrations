<p align="center">
  <a href="https://www.medusajs.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
      <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg" height="58">
    </picture>
  </a>
</p>
<h1 align="center">Production-ready Medusa DTC Starter</h1>

<p align="center">
  Storefront
</p>

<h4 align="center">
  <a href="https://docs.gorgojs.com/tools/medusa-dtc-starter">Starter documentation</a> |
  <a href="https://dtc-starter-demo.gorgojs.com">Live demo</a> |
  <a href="https://gorgojs.com">Gorgo</a>
</h4>

<p align="center">
  The Next.js storefront of <a href="../../README.md">Medusa DTC Starter by Gorgo</a>: a modal checkout with address autocomplete, a filterable catalog with instant search, 36 UI languages, and SEO with an <code>llms.txt</code> endpoint.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/next--intl-4-1e293b" alt="next-intl 4" />
  <img src="https://img.shields.io/badge/Tailwind-3-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license" />
</p>

## Commands

| Task | pnpm | npm | yarn |
|---|---|---|---|
| Start on port 8000 with Turbopack | `pnpm dev` | `npm run dev` | `yarn dev` |
| Production build (`standalone` output) | `pnpm build` | `npm run build` | `yarn build` |
| Serve the build on port 8000 | `pnpm start` | `npm start` | `yarn start` |
| Run ESLint | `pnpm lint` | `npm run lint` | `yarn lint` |
| Build with the bundle analyzer enabled | `pnpm analyze` | `npm run analyze` | `yarn analyze` |

`lint` and `analyze` load `next.config.js` like a build does, so both need `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in the environment or in `.env.local`.

## Environment Variables

Copy [`.env.template`](.env.template) to `.env.local`. `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is the only variable the app refuses to start without, because [`check-env-variables.js`](check-env-variables.js) runs from `next.config.js`. The Default column is the value the template ships.

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Publishable API key from the Medusa backend. Required | — |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Backend base URL | `http://localhost:9000` |
| `NEXT_PUBLIC_DEFAULT_REGION` | Country code (ISO 3166-1 alpha-2, lowercase) the middleware falls back to when neither the cookie nor a geo header resolves a region. The template's `en` matches no seeded region, in which case the first region the backend returns wins | `en` |
| `NEXT_PUBLIC_BASE_URL` | Storefront base URL, used for absolute URLs in metadata, the sitemap, and `llms.txt` | `https://localhost:8000` |
| `NEXT_PUBLIC_SITE_NAME` | Store name in the header, footer, checkout, `schema.org` markup, and `llms.txt` | `Gorgo Medusa Store` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 measurement ID, `G-XXXXXXXXXX`. Leave empty to ship no analytics at all | — |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key, only needed when paying through Stripe | — |
| `NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY` | Medusa Cloud Payments publishable key, used when `NEXT_PUBLIC_STRIPE_KEY` is empty | — |
| `NEXT_PUBLIC_MEDUSA_PAYMENTS_ACCOUNT_ID` | Connected account that key charges on behalf of, passed to Stripe as `stripeAccount` | — |
| `NEXT_PUBLIC_ADDRESS_AUTOCOMPLETE_PROVIDER` | Address autocomplete provider; `dadata`, or anything else for manual entry | `dadata` |
| `NEXT_PUBLIC_ADDRESS_AUTOCOMPLETE_PROVIDER_API_KEY` | API token for the address autocomplete provider | — |
| `GEOLOCATION_PROVIDER` | Country detection provider the middleware uses for a first-time visitor; `ip-api`, or anything else to rely on hosting platform geo headers only. Server-side only, so it carries no `NEXT_PUBLIC_` prefix | `ip-api` |
| `GEOLOCATION_PROVIDER_API_KEY` | API key for the geolocation provider. `ip-api` works without one against its free endpoint, which is HTTP only and non-commercial. A live shop needs a [pro key](https://members.ip-api.com) | — |
| `GEOLOCATION_DEBUG` | Emit `x-geo-*` response headers explaining how the region was resolved | `false` |
| `REVALIDATE_SECRET` | Shared secret checked on `api/revalidate`; must match the backend's value | `supersecret` |
| `MEDUSA_CLOUD_S3_HOSTNAME`, `MEDUSA_CLOUD_S3_PATHNAME` | Add the Medusa Cloud bucket to the allowed image hosts | — |
| `NODE_ENV` | Node environment | `development` |

See [Set Up Country Detection](https://docs.gorgojs.com/tools/medusa-dtc-starter/setup-country-detection) and [Set Up Address Autocomplete](https://docs.gorgojs.com/tools/medusa-dtc-starter/setup-address-autocomplete) for what the two pluggable providers do and how to add one of your own.

## Analytics

With `NEXT_PUBLIC_GA_MEASUREMENT_ID` set, [`GoogleAnalytics`](src/modules/common/components/google-analytics/index.tsx) holds `gtag.js` back until the browser goes idle after load, or until the visitor first scrolls, taps, clicks or types, capped at 3 seconds, which keeps the script out of Largest Contentful Paint and Total Blocking Time. That has two consequences. A visitor who closes the tab within the first second is never counted, and the tag loads for everyone, so a shop serving the EU or the UK needs a consent banner in front of it. Client-side navigation reports on its own, as long as **Enhanced Measurement** is on for the property.

Installation, features, deployment, and everything else that spans both apps live in the [root README](../../README.md).
