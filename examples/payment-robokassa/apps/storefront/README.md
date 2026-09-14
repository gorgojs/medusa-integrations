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

## What's in This App?

- **Modal checkout** – contacts, address, shipping, and payment each open as a sheet over one screen instead of a multi-page flow, with cart totals and promotion codes alongside. Stripe is wired up through `@stripe/react-stripe-js`; other providers come from the backend's [Integration Module](https://docs.gorgojs.com/medusa-modules/integration).
- **Pluggable address autocomplete** – [`modules/common/components/address-autocomplete`](src/modules/common/components/address-autocomplete) picks a provider from an environment variable. [DaData](https://dadata.ru/?ref=276331) ships built in, anything else falls back to four plain inputs, and the buyer can switch to manual entry at any point. See [Set Up Address Autocomplete](https://docs.gorgojs.com/tools/medusa-dtc-starter/setup-address-autocomplete).
- **Instant search** – a search dialog queries the Store API and highlights matches in the results.
- **Filterable catalog** – option filters, sorting by price and newest, a category and subcategory sidebar, and a bottom sheet on mobile. The selected filters stay in the URL, so a selection can be shared as a link.
- **36 languages and 241 countries** – locales are declared in [`src/i18n/config.ts`](src/i18n/config.ts) with messages in [`messages/`](messages), RTL included. The [middleware](src/middleware.ts) resolves the locale from the URL, a cookie, and the browser's `Accept-Language`. It resolves the region from a cookie, a pluggable geolocation provider in [`lib/geolocation`](src/lib/geolocation) (hosting platform geo headers, or an IP lookup through ip-api), and `NEXT_PUBLIC_DEFAULT_REGION`, caching the region map for an hour.
- **Accounts and orders** – login, registration, password reset, profile, addresses, order history, order details, and the accept and decline flows for order transfers. The reset link the backend emails lands on [`/reset-password`](src/app/[locale]/(main)/reset-password/page.tsx), which is excluded from indexing because the link carries a single-use token.
- **SEO and AI optimization** – [`sitemap.ts`](src/app/sitemap.ts) lists every catalog URL in all 36 locales, and [`robots.ts`](src/app/robots.ts) keeps crawlers out of the cart, checkout, account, and API routes. The home, store, product, category, and collection pages carry a canonical URL and hreflang alternates for all 36 locales from [`lib/util/alternates.ts`](src/lib/util/alternates.ts). Open Graph and Twitter images are set, and [`llms.txt`](src/app/llms.txt/route.ts) exposes the catalog to AI crawlers.
- **On-demand revalidation** – [`api/revalidate`](src/app/api/revalidate/route.ts) accepts the backend's webhook, checks the `x-revalidate-secret` header, and revalidates the product, store, category, and collection pages along with the sitemap and `llms.txt`.
- **Vendored country flags** – [`public/flags/4x3`](public/flags/4x3) carries the 241 seeded countries as same-origin SVGs from [flag-icons](https://github.com/lipis/flag-icons) v7.5.0, served `immutable`, with a pinned jsDelivr fallback for anything else.

Pages under `app/[locale]` declare no `generateStaticParams`. The locale and the region come from cookies and request headers, so pages render per request and caching happens in the data layer through fetch tags, which is what the revalidation webhook busts.

## Requirements

- Node.js v20.19+ (or v22.12+), matching the backend
- A running Medusa backend and its publishable API key

## Getting Started

This is an ordinary npm package, so npm, yarn, and pnpm all work. Install dependencies first, either with `pnpm install` at the repository root or with `npm install` or `yarn install` in this directory, then run:

```bash
cp .env.template .env.local         # then set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
pnpm dev                            # npm run dev, yarn dev
```

The storefront runs on `http://localhost:8000`. `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is the only variable the app refuses to start without, because [`check-env-variables.js`](check-env-variables.js) runs from `next.config.js`. Get the key from **Settings → Publishable API Keys** in the Medusa Admin.

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

Copy [`.env.template`](.env.template) to `.env.local`. The Default column below is the value the template ships.

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Publishable API key from the Medusa backend. Required | — |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Backend base URL | `http://localhost:9000` |
| `NEXT_PUBLIC_DEFAULT_REGION` | Country code (ISO 3166-1 alpha-2, lowercase) the middleware falls back to when neither the cookie nor a geo header resolves a region. The template's `en` matches no seeded region, in which case the first region the backend returns wins | `en` |
| `NEXT_PUBLIC_BASE_URL` | Storefront base URL, used for absolute URLs in metadata, the sitemap, and `llms.txt` | `https://localhost:8000` |
| `NEXT_PUBLIC_SITE_NAME` | Store name in the header, footer, checkout, `schema.org` markup, and `llms.txt` | `Gorgo Medusa Store` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 measurement ID, `G-XXXXXXXXXX`. Leave empty to ship no analytics at all | — |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key, only needed when paying through Stripe | — |
| `NEXT_PUBLIC_ADDRESS_AUTOCOMPLETE_PROVIDER` | Address autocomplete provider; `dadata`, or anything else for manual entry | `dadata` |
| `NEXT_PUBLIC_ADDRESS_AUTOCOMPLETE_PROVIDER_API_KEY` | API token for the address autocomplete provider | — |
| `GEOLOCATION_PROVIDER` | Country detection provider the middleware uses for a first-time visitor; `ip-api`, or anything else to rely on hosting platform geo headers only | `ip-api` |
| `GEOLOCATION_PROVIDER_API_KEY` | API key for the geolocation provider. `ip-api` works without one against the free `http://ip-api.com` endpoint (45 requests/minute, HTTP only, non-commercial use only), which is fine for local development. A live shop needs a [pro key](https://members.ip-api.com), which switches the lookup to `https://pro.ip-api.com` | — |
| `REVALIDATE_SECRET` | Shared secret checked on `api/revalidate`; must match the backend's value | `supersecret` |
| `MEDUSA_CLOUD_S3_HOSTNAME`, `MEDUSA_CLOUD_S3_PATHNAME` | Add the Medusa Cloud bucket to the allowed image hosts | — |
| `GEOLOCATION_DEBUG` | Emit `x-geo-*` response headers explaining how the region was resolved | `false` |
| `NODE_ENV` | Node environment | `development` |

### Country detection

A first-time visitor's region comes from [`lib/geolocation`](src/lib/geolocation). The middleware touches it in one place. `resolveCountry(request, regionMap)` returns a function that writes the `_medusa_country` cookie onto the response, so cookie precedence, the fallback chain and the debug headers all live in the module. Providers are picked the same way `AddressAutocomplete` does, with a `switch` in [`detect.ts`](src/lib/geolocation/detect.ts) keyed on `GEOLOCATION_PROVIDER`:

- **`platform`** (the default, no configuration) reads the country the hosting platform already resolved: `x-vercel-ip-country`, Cloudflare's `cf.country` and `cf-ipcountry`, App Engine, Fastly, or a `x-geo-country` / `x-country-code` header from your own proxy. Free, instant, no network call.
- **`ip-api`** checks those headers first, then looks the client IP up through [ip-api.com](https://ip-api.com). A visitor's own IP is cached for an hour, concurrent lookups for the same IP are collapsed into one request, and the provider honours ip-api's `X-Rl` / `X-Ttl` budget by pausing after a `429`.

Adding a provider means one file under `providers/` and one `case` in the switch.

Two behaviours worth knowing:

- **A local visitor.** When the client IP is loopback or a LAN address, the visitor shares the server's network, so the lookup runs against the server's own egress address. `localhost`, a LAN address, `next dev` and a `build`/`start` run all resolve to the country the machine actually browses from. This lookup is never cached and gets a longer timeout, so switching a VPN and clearing `_medusa_country` changes the region on the very next request. It costs one request per cookieless page load, which is why it is scoped to visitors on the server's own network; concurrent requests are still collapsed into a single lookup. When no header carries a client IP at all, no country is resolved: guessing from the server's location would pin every visitor to the datacentre's region. A deployment that resolves no country has a reverse proxy that is not forwarding `x-forwarded-for`.
- **A country the middleware could not resolve** is stored in `_medusa_country` for five minutes instead of a year, so one failed lookup cannot pin a visitor to the fallback region. A country the visitor picked in the region switcher is always kept for a year and wins over detection.

Set `GEOLOCATION_DEBUG=true` to have the middleware annotate every response with `x-geo-source`, `x-geo-detected`, `x-geo-provider`, `x-geo-client-ip`, and `x-geo-country`. It works in any mode, including a production build, and is the quickest way to see why a request landed in a given region: `x-geo-client-ip` reads `local` for a visitor on the server's own network and `unknown` when no header carried an IP.

### Analytics

Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to a GA4 measurement ID and the storefront starts reporting through [`GoogleAnalytics`](src/modules/common/components/google-analytics/index.tsx). Leave it empty and the component never renders, so a build without an ID requests no third-party script, opens no extra connection, and adds no bytes to the page.

With an ID set, `gtag.js` still stays out of the critical path. The component holds the tag back until the browser goes idle after load, or until the visitor first scrolls, taps, clicks or types, whichever comes first. A 3 second ceiling caps the wait so a busy main thread cannot postpone the tag indefinitely. Google's tag lives on a domain the browser has not contacted yet, so loading it during hydration buys a DNS lookup, a TLS handshake, a download and a parse inside the window Lighthouse measures for Total Blocking Time. Deferring moves all of that past the point where the page is already interactive, and keeps Largest Contentful Paint and First Contentful Paint free of it.

Two consequences are worth knowing before you ship this:

- **A very fast bounce goes uncounted.** A visitor who closes the tab within the first second, before the browser reaches an idle moment, never loads the tag. The exchange is deliberate: the alternative charges every visitor for the tag so that the ones who leave immediately can be counted.
- **There is no consent gate.** The tag loads for everyone once the ID is set. A shop serving the EU or the UK needs a consent banner in front of it, which means rendering `GoogleAnalytics` only after the visitor has agreed.

Client-side navigation between routes reports on its own. GA4 records a pageview whenever the browser history state changes, so the App Router needs no extra wiring, as long as **Enhanced Measurement** is on for the property with **Page changes based on browser history events** checked.

## Project Structure

```
apps/storefront/
├── check-env-variables.js        # fails the build when the publishable key is missing
├── next.config.js                # standalone output, next-intl, image hosts, flag caching
├── messages/                     # 36 UI locales
├── public/flags/                 # 241 vendored country flags
└── src/
    ├── app/
    │   ├── [locale]/(main)/      # home, store, categories, collections, products, cart, account, order
    │   ├── [locale]/(checkout)/  # checkout
    │   ├── api/revalidate/       # webhook endpoint for backend cache invalidation
    │   ├── llms.txt/             # catalog feed for AI crawlers
    │   ├── sitemap.ts            # every catalog URL in all 36 locales
    │   └── robots.ts
    ├── i18n/                     # locale list, routing, request config
    ├── lib/                      # data fetching, constants, hooks, utils
    │   └── geolocation/          # country detection providers
    ├── middleware.ts             # locale and region resolution
    ├── modules/                  # store, products, cart, checkout, account, layout, common
    └── styles/
```

## Documentation

- [Production-ready Medusa DTC Starter](https://docs.gorgojs.com/tools/medusa-dtc-starter)
- [Getting Started with Medusa DTC Starter](https://docs.gorgojs.com/tools/medusa-dtc-starter/getting-started)
- [Set Up Address Autocomplete](https://docs.gorgojs.com/tools/medusa-dtc-starter/setup-address-autocomplete)
- [Medusa storefront development](https://docs.medusajs.com/resources/storefront-development)

## Support and Community

Connect with other Medusa developers on Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

More Medusa channels: [GitHub Discussions](https://github.com/medusajs/medusa/discussions), [Discord](https://discord.com/invite/medusajs), [Medusa blog](https://medusajs.com/blog/), [Gorgo blog](https://gorgojs.com/blog/)

## License

MIT — see [LICENSE](../../LICENSE).
