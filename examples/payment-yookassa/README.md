# `@gorgo/medusa-payment-yookassa` example

Example for the [@gorgo/medusa-payment-yookassa](https://www.npmjs.com/package/@gorgo/medusa-payment-yookassa)
plugin, scaffolded from the [Medusa DTC Starter by Gorgo](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with yarn.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- A YooKassa account – [sign in or create one](https://yookassa.ru/joinups/?source=ks), a shop identifier `shopId` and a key `secretKey`.

## Configuration

Set up environment variables for both apps:

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

This example registers YooKassa through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so its credentials are
stored encrypted rather than read from the environment at runtime. The backend only needs
`INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to `supersecret` for development.

If you already have a YooKassa shop, fill in `SEED_YOOKASSA_SHOP_ID` and `SEED_YOOKASSA_SECRET_KEY` in
`apps/backend/.env` before the next step. The seed migration script reads them once and stores them
through the Integration Module. Leave them blank to enter the credentials in Medusa Admin instead, in
[Connecting YooKassa](#connecting-yookassa) below.

The rest of the configuration the seed writes either way, auto-capture, the payment description and
receipts with Atol Online FFD 1.2 on the general taxation system without VAT. They are demo values,
so check them in Admin against what your own shop is registered for.

## Installation & Development

Follow the [common instructions](../README.md#medusa-dtc-starter-examples) for a Medusa DTC Starter
example. They install the workspace, migrate the database, create the `admin@medusajs.com` user with
the password `supersecret`, seed the demo catalog and start both apps.

## Connecting YooKassa

1. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations → YooKassa**. The
   seed has filled every setting, and the credentials too when your `.env` carried them. Fill in the
   shop identifier and the secret key under **Credentials** if they are still empty, then set
   auto-capture and the receipt parameters to match your shop. See
   [Manage YooKassa Settings in Medusa Admin](https://docs.gorgojs.com/medusa-integrations/yookassa/settings).

2. The seed already lists YooKassa among the payment providers of all 241 regions, so nothing to do
   here. A region you add by hand needs it too, under **Settings → Regions**, since a provider
   missing from the region never reaches the checkout.

3. Serve the backend over a public address and register the webhook, since YooKassa reports the
   payment status to it:

   ```bash
   cd apps/backend
   yarn dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-yookassa.loca.lt`, and the storefront has
   its own `yarn dev:tunnel`. Add the webhook at
   [yookassa.ru/my/merchant/integration/http-notifications](https://yookassa.ru/my/merchant/integration/http-notifications)
   in this format:

   ```text
   https://{YOUR_MEDUSA_DOMAIN}/hooks/payment/yookassa_yookassa
   ```

   Over https the cart cookie has to be marked secure to survive the redirect back from the payment
   page, so uncomment `COOKIE_SECURE=true` in `apps/backend/.env` and set `NEXT_PUBLIC_BASE_URL` in
   `apps/storefront/.env.local` to the storefront's public address.

4. Fill a cart in the storefront, pick YooKassa at the checkout and pay. YooKassa sends the customer
   back to `/api/payment-return`, and the order is placed by whichever arrives first, that return or
   the webhook.

## What the Example Adds to the Starter

The starter ships the extension points and no payment provider of its own, so the whole integration
is ten files. Port them into your own storefront to get the same flow.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the integration provider `yookassa-1`, the plugin itself so the Admin build picks up its i18n, and the payment provider bound to that integration id |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `dev:local` for a locally published copy of the plugin |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_payment_yookassa`, documents `COOKIE_SECURE`, and adds the optional `SEED_YOOKASSA_SHOP_ID`/`SEED_YOOKASSA_SECRET_KEY` pair the seed reads |
| [`apps/backend/src/migration-scripts/lib/regions.ts`](./apps/backend/src/migration-scripts/lib/regions.ts) | Seeds YooKassa as a payment provider of every region, next to manual payment |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Configures YooKassa through the Integration Module, the auto-capture and receipt settings always and the credentials when `SEED_YOOKASSA_SHOP_ID`/`SEED_YOOKASSA_SECRET_KEY` are set, wired into the seed from `initial-data-seed.ts` |
| [`apps/storefront/src/lib/constants.tsx`](./apps/storefront/src/lib/constants.tsx) | Labels the provider at the checkout, points it at its icon, and builds the session data YooKassa needs (the return address, and the cart its receipt is generated from) |
| [`apps/storefront/src/modules/common/icons/yookassa.tsx`](./apps/storefront/src/modules/common/icons/yookassa.tsx) | Draws the YooKassa mark shown on the checkout option |
| [`apps/storefront/src/modules/checkout/components/payment-button/providers/yookassa.tsx`](./apps/storefront/src/modules/checkout/components/payment-button/providers/yookassa.tsx) | Sends the customer to the YooKassa payment page |
| [`apps/storefront/src/app/api/payment-return/route.ts`](./apps/storefront/src/app/api/payment-return/route.ts) | Handles the return from the payment page and places the order unless the webhook got there first |
| [`apps/storefront/messages/*.json`](./apps/storefront/messages) | Labels YooKassa in all 36 storefront locales, with the payment methods it accepts as the subtitle |
