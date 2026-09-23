# `@gorgo/medusa-1c` example

Example for the [@gorgo/medusa-1c](https://www.npmjs.com/package/@gorgo/medusa-1c) plugin,
scaffolded from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter). Like
`all-integrations`, this example is backend-only: 1C exchanges the catalog with the backend
directly, nothing about it is a storefront concern, so there is no `apps/storefront`, installed
from the workspace root with yarn.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- A 1C:Enterprise installation with the CommerceML exchange module, configured to talk to a Medusa
  backend. Nothing needs to be signed up for — 1C calls into this backend, not the other way around.

## Configuration

Set up environment variables for the backend:

```bash
cp apps/backend/.env.template apps/backend/.env
```

This example registers 1C through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), but 1C itself has no
credentials to configure there — it authenticates against the exchange endpoint with a Medusa admin
user's own email and password, the ones the [common instructions](../README.md#installation--development)
create. The backend only needs `INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to
`supersecret` for development.

The seed writes 1C's sync defaults either way — a disabled interval, a 10 MB chunk size and no
zip compression. They are demo values, so check them in Admin against your own 1C exchange setup.

## Installation & Development

Follow the [common instructions](../README.md#installation--development). They install the
workspace, migrate the database, create the `admin@medusajs.com` user with the password
`supersecret`, seed the demo catalog and start the backend. There is no storefront to start here —
run everything from `apps/backend`.

## Connecting 1C

1. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations → 1C:Enterprise**.
   The seed has filled the sync defaults. Set the sync interval, whether the exchange is
   zip-compressed, and the product attribute mappings (height, width, length, weight, HS code, MID
   code, origin country) to match your own catalog's custom fields. See
   [Manage 1C:Enterprise Settings in Medusa Admin](https://docs.gorgojs.com/medusa-integrations/1c-enterprise/settings).

2. Serve the backend over a public address, since 1C reaches the exchange endpoint over the public
   internet:

   ```bash
   cd apps/backend
   yarn dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-1c.loca.lt`.

3. In 1C:Enterprise, configure the CommerceML exchange with the exchange URL, and the
   `admin@medusajs.com` email and `supersecret` password (or whichever admin user you created) as
   the exchange credentials:

   ```text
   https://{YOUR_MEDUSA_DOMAIN}/1c/exchange
   ```

4. Run the exchange from 1C. It imports the classifier and the offers into products, categories and
   inventory levels the same way the demo catalog is seeded, and subsequent runs update them. With no
   storefront in this example, check the result in Admin → Products or against the Store API rather
   than through a checkout page.

## What the Example Adds to the Starter

The starter ships the extension points and no integration provider of its own, so the whole
integration is four backend files, and no storefront at all.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the integration provider `1c-1`, the plugin itself so the Admin build picks up its i18n, and `admin.vite.server.allowedHosts` so the Admin answers through a tunnel |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `predev` to link a locally published copy of the plugin before `dev` starts |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_erp_1c` and documents the tunnel |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Configures 1C through the Integration Module with its sync defaults, wired into the seed from `initial-data-seed.ts` |

Nothing in a storefront changes, because this example has none. The seed's regions are untouched
either way — 1C is not a payment or fulfillment provider, so it has no `payment_providers` entry to
add. Port these files into your own project the same way a single-provider example's are ported.
