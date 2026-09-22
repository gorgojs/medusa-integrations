# `@gorgo/medusa-payment-robokassa` example

Example for the [@gorgo/medusa-payment-robokassa](https://www.npmjs.com/package/@gorgo/medusa-payment-robokassa)
plugin, scaffolded from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with yarn.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- A Robokassa account - [sign in or create one](https://login.robokassa.ru/reg?promoCode=gorgo), a shop identifier `MerchantLogin`, secret passwords `password1`, `password2` and for testing `testPassword1` and `testPassword2`.

## Configuration

Set up environment variables for both apps:

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

This example registers Robokassa through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so its credentials are
stored encrypted rather than read from the environment at runtime. The backend only needs
`INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to `supersecret` for development.

If you already have a Robokassa shop, fill in `SEED_ROBOKASSA_MERCHANT_LOGIN`, `SEED_ROBOKASSA_PASSWORD1`
and `SEED_ROBOKASSA_PASSWORD2` in `apps/backend/.env` before the next step. The seed migration script
reads them once and stores them through the Integration Module. Leave them blank to enter the
credentials in Medusa Admin instead, in [Connecting Robokassa](#connecting-robokassa) below.

The rest of the configuration the seed writes either way: the hash algorithm, auto-capture and
receipts on the general taxation system without VAT. They are demo values, so check them in Admin
against what your own shop is registered for.

## Installation & Development

Follow the [common instructions](../README.md#installation--development). They install the workspace,
migrate the database, create the `admin@medusajs.com` user with the password `supersecret`, seed the
demo catalog and start both apps.

## Connecting Robokassa

1. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations → Robokassa**.
   The seed has filled every setting, and the credentials too when your `.env` carried them. Fill in
   the merchant login and the passwords under **Credentials** if they are still empty, then set test
   mode, auto-capture and the receipt parameters to match your shop. See
   [Manage Robokassa Settings in Medusa Admin](https://docs.gorgojs.com/medusa-integrations/robokassa/settings-beta).

2. The seed already lists Robokassa among the payment providers of all 241 regions, so nothing to do
   here. A region you add by hand needs it too, under **Settings → Regions**, since a provider
   missing from the region never reaches the checkout.

3. Serve the backend over a public address and register the webhook, since Robokassa reports the
   payment status to it:

   ```bash
   cd apps/backend
   yarn dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-robokassa.loca.lt`, and the storefront
   has its own `yarn dev:tunnel`. Under the shop settings in your Robokassa account set the method
   of sending data to the result URL to `POST`, the only method the webhook route accepts, and supply
   the result URL in this format:

   ```text
   https://{YOUR_MEDUSA_DOMAIN}/hooks/payment/robokassa_robokassa
   ```

   A tunnelled storefront is a different origin, so add its public address to `STORE_CORS` in
   `apps/backend/.env` and set `NEXT_PUBLIC_BASE_URL` in `apps/storefront/.env.local` to it. Over
   https the cart cookie has to be marked secure to survive the redirect back from the payment page,
   so uncomment `COOKIE_SECURE=true` as well.

4. Fill a cart in the storefront, pick Robokassa at the checkout and pay. Robokassa sends the
   customer back to `/api/payment-return`, and the order is placed by whichever arrives first, that
   return or the webhook.

## What the Example Adds to the Starter

The starter ships the extension points and no payment provider of its own, so the whole integration
is nine files. Port them into your own storefront to get the same flow.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the integration provider `robokassa-1`, the plugin itself so the Admin build picks up its i18n, and the payment provider bound to that integration id |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `predev` to link a locally published copy of the plugin before `dev` starts |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_payment_robokassa`, documents `COOKIE_SECURE` and the tunnel origin, and adds the optional `SEED_ROBOKASSA_MERCHANT_LOGIN`/`SEED_ROBOKASSA_PASSWORD1`/`SEED_ROBOKASSA_PASSWORD2` trio the seed reads |
| [`apps/backend/src/migration-scripts/lib/regions.ts`](./apps/backend/src/migration-scripts/lib/regions.ts) | Seeds Robokassa as a payment provider of every region, next to manual payment |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Configures Robokassa through the Integration Module, the hash algorithm, auto-capture and receipt settings always and the credentials when `SEED_ROBOKASSA_MERCHANT_LOGIN`/`SEED_ROBOKASSA_PASSWORD1`/`SEED_ROBOKASSA_PASSWORD2` are set, wired into the seed from `initial-data-seed.ts` |
| [`apps/storefront/src/lib/constants.tsx`](./apps/storefront/src/lib/constants.tsx) | Names the provider at the checkout and builds the session data Robokassa needs (`SuccessUrl2` and `FailUrl2` with their methods, the buyer's email, the payment page language, and the cart its receipt is generated from) |
| [`apps/storefront/src/modules/checkout/components/payment-button/providers/robokassa.tsx`](./apps/storefront/src/modules/checkout/components/payment-button/providers/robokassa.tsx) | Sends the customer to the `paymentUrl` the session carries |
| [`apps/storefront/src/app/api/payment-return/route.ts`](./apps/storefront/src/app/api/payment-return/route.ts) | Handles the return from the payment page and places the order unless the webhook got there first |
| [`apps/storefront/messages/*.json`](./apps/storefront/messages) | Names Robokassa in all 36 storefront locales |
