# `@gorgo/medusa-feed-yandex` example

Example for the [@gorgo/medusa-feed-yandex](https://www.npmjs.com/package/@gorgo/medusa-feed-yandex)
plugin, scaffolded from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with yarn.

The storefront is new here. The plugin needs no storefront code at all, but the starter ships one,
and it gives the feed a demo catalog to export and a place to see the products it lists.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- A [Yandex Market](https://partner.market.yandex.ru/) account to submit the feed to. Generating and
  serving it needs no account at all.

## Configuration

Set up environment variables for both apps:

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

The plugin itself takes no credentials. What it does need is `MEDUSA_BACKEND_URL`, the address the
generated file is served under, which `.env.template` sets to `http://localhost:9000` for
development.

## Installation & Development

Follow the [common instructions](../README.md#installation--development). They install the workspace,
migrate the database, create the `admin@medusajs.com` user with the password `supersecret`, seed the
demo catalog and start both apps.

## Exporting a Feed

1. Open the Admin at http://localhost:9000/app and go to **Settings → Feeds**. The seed has already
   created a feed with a title, a file name and the shop name and URL filled in. Pick the categories
   to export and fill in the company that goes into the YML header. See
   [Manage Yandex YML Feeds](https://docs.gorgojs.com/medusa-integrations/yandex-yml-feed/usage).

2. The feed runs on its own schedule and can be launched by hand from the same page. Each run writes
   a gzip-compressed file into the local file store under `apps/backend/static` and records its
   address on the feed.

3. The readable feed is served from the backend at:

   ```text
   {MEDUSA_BACKEND_URL}/feeds/{FEED_ID}/{FILE_NAME}.xml
   ```

   The route appends `.xml` to the file name stored on the feed, so a feed whose file name is
   `example1` is served at `/feeds/{FEED_ID}/example1.xml`.

4. Yandex fetches that URL over the public internet, so serve the backend through a tunnel before
   submitting it and point `MEDUSA_BACKEND_URL` at the tunnel:

   ```bash
   cd apps/backend
   yarn dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-feed-yandex.loca.lt`.

## What the Example Adds to the Starter

The plugin is backend-only, so the whole integration is four files.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the feed module, the plugin itself so the Admin build picks up the feed UI and its i18n, and a local file provider for development, since the starter only configures S3 and only in production |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `predev` to link a locally published copy of the plugin before `dev` starts |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_feed_yandex` and documents `MEDUSA_BACKEND_URL` |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Creates a demo feed with the shop name and URL filled in from `STORE_NAME`/`STOREFRONT_URL`, wired into the seed from `initial-data-seed.ts`; the company and the categories to export are left blank for Admin |

Nothing in the storefront changes. A payment example adds its provider to every seeded region; a
feed has no region to touch, so the only seed addition here is the demo feed itself.
