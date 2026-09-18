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

`medusa develop` runs `medusa lint` before it starts and refuses to boot on a lint error, while `medusa build` reports problems and builds anyway. Pass `--lint false` to either one to skip it.

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

Installation, seed data, deployment, and everything else that spans both apps live in the [root README](../../README.md).
