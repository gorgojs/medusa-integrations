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
  Backend
</p>

<h4 align="center">
  <a href="https://docs.gorgojs.com/tools/medusa-dtc-starter">Starter documentation</a> |
  <a href="https://docs.medusajs.com">Medusa documentation</a> |
  <a href="https://gorgojs.com">Gorgo</a>
</h4>

<p align="center">
  The Medusa application behind <a href="../../README.md">Medusa DTC Starter by Gorgo</a>: Store and Admin APIs, the Admin dashboard, transactional emails, seed data for 241 countries and 36 locales, and the Integration Module for configuring providers without a redeploy.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Medusa-2.19-7c3aed" alt="Medusa 2.19" />
  <img src="https://img.shields.io/badge/Node-%3E%3D20.19-339933?logo=nodedotjs&logoColor=white" alt="Node >= 20.19" />
  <img src="https://img.shields.io/badge/PostgreSQL-15%2B-4169e1?logo=postgresql&logoColor=white" alt="PostgreSQL 15+" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license" />
</p>

## What's in This App?

On top of a stock Medusa 2 application, this backend ships:

- **SMTP notification provider** – [`src/modules/smtp-notification`](src/modules/smtp-notification) sends [React Email](https://react.email/) templates through `nodemailer`. It is registered as the `email` channel of the Notification Module, alongside Medusa's local `feed` provider.
- **Ten email templates** – [`src/emails`](src/emails) covers the welcome, password reset, order placed, order completed, payment captured, order packed, order shipped, order delivered, order canceled, and order transfer request emails, with copy in 36 languages under [`src/emails/i18n`](src/emails/i18n). They share one style sheet, [`src/emails/lib/styles.ts`](src/emails/lib/styles.ts), built from the same design tokens the storefront renders with. Every email reaches the buyer in the language they shopped in.
- **Eleven subscribers** – [`src/subscribers`](src/subscribers) sends those emails on `customer.created`, `auth.password_reset`, `order.placed`, `order.completed`, `order.fulfillment_created`, `shipment.created`, `delivery.created`, `order.canceled`, `order.transfer_requested`, and `payment.captured`. Three of those events carry the Admin's "do not notify the customer" flag, and the subscribers honour it. [`product-updated.ts`](src/subscribers/product-updated.ts) posts a revalidation webhook to the storefront on 24 more events: create, update, and delete for products, variants, options, types, tags, categories, collections, and translations.
- **Initial data seed** – [`src/migration-scripts/initial-data-seed.ts`](src/migration-scripts/initial-data-seed.ts) creates the store, 241 regions with their currencies and shipping options, 36 locales' translations, and a demo catalog. Every stage lives in [`src/migration-scripts/lib`](src/migration-scripts/lib) and reads its input from JSON under [`src/migration-scripts/data`](src/migration-scripts/data).
- **Integration Module** – [`@gorgo/medusa-integration`](https://docs.gorgojs.com/medusa-modules/integration) is registered in [`medusa-config.ts`](medusa-config.ts), so payment, fulfillment, and ERP providers are configured under **Settings → Integrations** in the Admin instead of in config files.
- **Translations feature flag** – Medusa's Translation Module is enabled, which is what the seeded locale data and the storefront's translated catalog rely on.
- **Optional Redis and S3** – the cache, event bus, and workflow engine switch to Redis in production as soon as `REDIS_URL` is set, and in development once you also set `USE_REDIS=true`. File uploads move to S3-compatible storage once `S3_BUCKET` is set and `NODE_ENV` is `production`.

## Requirements

- Node.js v20.19+ (or v22.12+)
- PostgreSQL v15 or later
- Redis, optional in development. Development runs the in-memory cache, event bus, and workflow engine unless you set `USE_REDIS=true` alongside `REDIS_URL`.

## Getting Started

This is an ordinary npm package, so npm, yarn, and pnpm all work. Install dependencies first, either with `pnpm install` at the repository root or with `npm install` or `yarn install` in this directory, then run:

```bash
cp .env.template .env               # then set DATABASE_URL
pnpm medusa db:migrate              # npx medusa db:migrate, yarn medusa db:migrate
pnpm medusa user -e admin@medusajs.com -p supersecret
pnpm seed                           # npm run seed, yarn seed
pnpm dev                            # npm run dev, yarn dev
```

The application runs on `http://localhost:9000` and the Admin dashboard on `http://localhost:9000/app`. Copy the publishable API key from **Settings → Publishable API Keys** into the storefront's `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

For the full walkthrough, see [Getting Started with Medusa DTC Starter](https://docs.gorgojs.com/tools/medusa-dtc-starter/getting-started).

## Commands

| Task | pnpm | npm | yarn |
|---|---|---|---|
| Start in development mode with the Admin and hot reload | `pnpm dev` | `npm run dev` | `yarn dev` |
| Build the application, then copy the seed JSON into the build output | `pnpm build` | `npm run build` | `yarn build` |
| Start from the build | `pnpm start` | `npm start` | `yarn start` |
| Run migrations and sync links | `pnpm medusa db:migrate` | `npx medusa db:migrate` | `yarn medusa db:migrate` |
| Seed the store, regions, locales, and the demo catalog | `pnpm seed` | `npm run seed` | `yarn seed` |
| Lint with `@medusajs/eslint-plugin` | `pnpm lint` | `npm run lint` | `yarn lint` |
| Unit tests | `pnpm test:unit` | `npm run test:unit` | `yarn test:unit` |
| HTTP integration tests | `pnpm test:integration:http` | `npm run test:integration:http` | `yarn test:integration:http` |
| Module integration tests | `pnpm test:integration:modules` | `npm run test:integration:modules` | `yarn test:integration:modules` |

Linting runs through `medusa lint`, which reads [`eslint.config.mjs`](eslint.config.mjs). `medusa develop` runs the same check before it starts and refuses to boot on a lint error, while `medusa build` reports problems and builds anyway. Pass `--lint false` to either one to skip it.

## Environment Variables

Copy [`.env.template`](.env.template) to `.env`. Only `DATABASE_URL` has to be set for the application to boot, and every `supersecret` value has to be replaced before production.

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres@localhost/$DB_NAME` |
| `DB_NAME` | Database name interpolated into `DATABASE_URL` | `medusa_dtc_starter` |
| `STORE_CORS` | Allowed origins for the Store API | `http://localhost:8000,…` |
| `ADMIN_CORS` | Allowed origins for the Admin API | `http://localhost:5173,http://localhost:9000,…` |
| `AUTH_CORS` | Allowed origins for authentication | `http://localhost:5173,http://localhost:9000,…` |
| `JWT_SECRET` | Signing secret for JWTs | `supersecret` |
| `COOKIE_SECRET` | Signing secret for cookies | `supersecret` |
| `COOKIE_SECURE` | Set to `true` to send cookies over HTTPS only | `false` |
| `REDIS_URL` | Redis instance for the cache, event bus, and workflow engine in production | `redis://localhost:6379` |
| `USE_REDIS` | Set it to `true` to use `REDIS_URL` in development too | unset |
| `CACHE_REDIS_URL` | Separate Redis instance for the cache | `REDIS_URL` |
| `INTEGRATION_ENCRYPTION_KEY` | Encrypts the secret fields the Integration Module stores | `supersecret` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP transport for transactional emails | `smtp.example.com`, `587`, `false` |
| `SMTP_USER`, `SMTP_PASS` | SMTP credentials | — |
| `SMTP_FROM`, `SMTP_REPLY_TO` | Sender and reply-to addresses. `SMTP_FROM` carries the address; the name beside it comes from `STORE_NAME` | — |
| `STOREFRONT_URL` | Storefront base URL used in email links and revalidation webhooks | `http://localhost:8000` |
| `REVALIDATE_SECRET` | Sent as `x-revalidate-secret` to the storefront; must match its value | `supersecret` |
| `STOREFRONT_DEFAULT_LOCALE` | Fallback email language when the buyer's is unknown, one of the locales under `src/emails/i18n` | `en` |
| `STORE_NAME`, `STORE_EMAIL`, `STORE_PHONE`, `STORE_ADDRESS` | Store branding in email templates. `STORE_NAME` is also the sender name emails arrive under | — |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` | S3-compatible file storage, used when `NODE_ENV=production` | — |
| `MEDUSA_ADMIN_ONBOARDING_NEXTJS_DIRECTORY` | Storefront directory for Medusa's onboarding flow | `medusa-storefront` |

## Project Structure

```
apps/backend/
├── medusa-config.ts              # modules, plugins, feature flags
├── scripts/
│   └── copy-migration-data.js    # copies seed JSON into the build output
└── src/
    ├── admin/                    # scaffold for Admin extensions, with an empty i18n export
    ├── api/                      # scaffold with Medusa's example store and admin routes
    ├── emails/                   # React Email templates and email i18n
    ├── jobs/                     # scheduled jobs, empty
    ├── links/                    # module links, empty
    ├── migration-scripts/        # initial-data-seed.ts, lib/ stages, data/ JSON
    ├── modules/                  # smtp-notification provider
    ├── subscribers/              # transactional emails and storefront revalidation
    └── workflows/                # custom workflows, empty
```

The scaffold and empty directories carry no starter code. Each of them keeps its own README with the Medusa framework reference for the primitive it holds, so you can drop your own widget, route, job, link, or workflow in place.

## Customizing the Seed Data

The seed script reads every stage from JSON, so adapting it to your markets and catalog means editing data files, not TypeScript.

Its only existence check is the sales channel named in `data/store/json/store.json`. While that sales channel exists, the script logs that the store is already seeded and does nothing, so edited data files take effect on a fresh database. If you delete the sales channel and run the script again, every other stage runs again without checking for duplicates, because the workflows it calls do not deduplicate by handle.

See [Customize Seed Data](https://docs.gorgojs.com/tools/medusa-dtc-starter/customize-seed-data) for the file formats, currency rules, and the pre-launch checklist.

## What is Medusa?

Medusa is a set of commerce modules and tools for building commerce applications without reinventing core commerce logic. The modules are open source, published on npm, and can be composed into stores, marketplaces, or anything else that needs commerce primitives.

Read about [Medusa's architecture](https://docs.medusajs.com/learn/introduction/architecture) and [commerce modules](https://docs.medusajs.com/learn/fundamentals/modules/commerce-modules) in the docs.

## What is Gorgo?

Gorgo builds and maintains open-source integrations, extensions, and starters for Medusa, so that adapting the platform to a local market costs less time and code. This starter is one of them. Gorgo also curates a catalog of community and official Medusa plugins and runs the Medusa developer community on Telegram.

Learn more on the [Gorgo website](https://gorgojs.com), browse the [plugin catalog](https://gorgojs.com/medusa/plugins), or read the [DTC Starter documentation](https://docs.gorgojs.com/tools/medusa-dtc-starter).

## Support and Community

Connect with other Medusa developers on Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

More Medusa channels: [GitHub Discussions](https://github.com/medusajs/medusa/discussions), [Discord](https://discord.com/invite/medusajs), [Medusa blog](https://medusajs.com/blog/), [Gorgo blog](https://gorgojs.com/blog/)

## License

MIT — see [LICENSE](../../LICENSE).
