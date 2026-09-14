# `@gorgo/medusa-feed-yandex` example

Example for the [@gorgo/medusa-feed-yandex](https://www.npmjs.com/package/@gorgo/medusa-feed-yandex)
plugin, scaffolded from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with pnpm.

The storefront is new here. The plugin needs no storefront code at all, but the starter ships one,
and it gives the feed a demo catalog to export and a place to see the products it lists.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites), pnpm v10+ included.
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

Follow the [common instructions](../README.md#medusa-dtc-starter-examples) for a Medusa DTC Starter
example. They install the workspace, migrate the database, create the `admin@medusajs.com` user with
the password `supersecret`, seed the demo catalog and start both apps.

## Exporting a Feed

1. Open the Admin at http://localhost:9000/app and go to **Settings → Feeds**. Create a feed, give it
   a title and a file name, pick the categories to export and fill in the shop name, the company and
   the shop URL that go into the YML header. See
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
   pnpm dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-feed-yandex.loca.lt`.

## What the Example Adds to the Starter

The plugin is backend-only, so the whole integration is three files.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the feed module, the plugin itself so the Admin build picks up the feed UI and its i18n, and a local file provider for development, since the starter only configures S3 and only in production |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `dev:local` for a locally published copy of the plugin |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_feed_yandex` and documents `MEDUSA_BACKEND_URL` |

Nothing in the storefront changes, and the seed is untouched. A payment example adds its provider to
every seeded region; a feed has nothing to add there.

## How the Example Was Scaffolded

The tree comes from the starter at commit
[`f3823d8`](https://github.com/gorgojs/medusa-dtc-starter/commit/f3823d806005da72eb6e91b3221eeabefd0e912c),
generated with the Medusa CLI and then given the changes above:

```bash
pnpm dlx create-medusa-app@latest --repo-url https://github.com/gorgojs/medusa-dtc-starter --no-migrations
```

`--no-migrations` is deliberate. Without it the generator creates the admin user itself, which opens
a browser and asks a human to type a password, and only that human ends up knowing it. The generated
user would also take `admin@medusajs.com` from the one the instructions above create. Migrations, the
user and the seed all run after generation, from this example's own commands.

To refresh the example against a newer starter, generate it again and re-apply the three files.
