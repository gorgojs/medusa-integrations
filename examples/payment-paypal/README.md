# `@gorgo/medusa-payment-paypal` example

Example for the [@gorgo/medusa-payment-paypal](https://www.npmjs.com/package/@gorgo/medusa-payment-paypal)
plugin, scaffolded from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with yarn.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- A PayPal Business account and an app in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/), with the client ID and the secret of its sandbox environment
- A personal sandbox account to pay with, listed under **Sandbox accounts** in the same dashboard

## Configuration

Set up environment variables for both apps:

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

This example registers PayPal through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so its credentials are
stored encrypted rather than read from the environment at runtime. The backend only needs
`INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to `supersecret` for development.

If you already have a PayPal app, fill in `SEED_PAYPAL_CLIENT_ID` and `SEED_PAYPAL_CLIENT_SECRET` in
`apps/backend/.env` before the next step, and `SEED_PAYPAL_WEBHOOK_ID` once you have a webhook. The
seed migration script reads them once and stores them through the Integration Module. Leave them
blank to enter the credentials in Medusa Admin instead, in [Connecting PayPal](#connecting-paypal)
below.

The seed writes the rest of the configuration either way, the sandbox environment and capture right
away. It offers PayPal in every seeded region whose currency PayPal accepts, and the storefront
starts customers in the US region.

## Installation & Development

Follow the [common instructions](../README.md#installation--development). They install the workspace,
migrate the database, create the `admin@medusajs.com` user with the password `supersecret`, seed the
demo catalog and start both apps.

## Connecting PayPal

1. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations → PayPal**. Fill
   in the client ID and the secret under **Credentials** if the seed did not, and press **Test
   connection**. It checks the keys against the chosen environment and, once a webhook ID is set,
   that the webhook exists and listens to the events the plugin needs. See
   [Manage PayPal Settings in Medusa Admin](https://docs.gorgojs.com/medusa-integrations/paypal/settings).

2. The seed already lists PayPal among the payment providers of every region whose currency PayPal
   accepts. A region you add by hand needs it too, under **Settings → Regions**, since a provider
   missing from the region never reaches the checkout.

3. Serve the backend over a public address and register the webhook, since PayPal reports captures
   to it:

   ```bash
   cd apps/backend
   yarn dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-paypal.loca.lt`, and the storefront has
   its own `yarn dev:tunnel`. In the app's sandbox settings in the PayPal Developer Dashboard, add a
   webhook with a URL in this format, subscribed to `PAYMENT.AUTHORIZATION.CREATED` and
   `PAYMENT.CAPTURE.COMPLETED`:

   ```text
   https://{YOUR_MEDUSA_DOMAIN}/hooks/payment/paypal_paypal
   ```

   Then put its ID into **Webhook ID** in the Admin. Without it the backend cannot verify PayPal's
   webhooks and ignores them.

4. Fill a cart in the storefront and pay with the personal sandbox account. PayPal shows in two
   places. The express checkout row above the form opens PayPal straight away, takes the address
   you pick there, recalculates the shipping and the total, and places the order once you approve.
   At the payment step, the PayPal button pays for the cart with the address you entered. When the
   tab closes after PayPal has captured the payment, the `PAYMENT.CAPTURE.COMPLETED` webhook still
   places the order.

## What the Example Adds to the Starter

The starter ships the express checkout row and the payment extension points, and no payment
provider of its own, so the integration is the files below. Port them into your own storefront to
get the same flow.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the integration provider `paypal-1`, the plugin itself so the Admin build picks up its i18n, and the payment provider bound to that integration id |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `predev` to link a locally published copy of the plugin before `dev` starts |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_payment_paypal` and adds the optional `SEED_PAYPAL_CLIENT_ID`, `SEED_PAYPAL_CLIENT_SECRET` and `SEED_PAYPAL_WEBHOOK_ID` the seed reads |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Configures PayPal through the Integration Module with the sandbox environment and capture right away, adds the credentials when the `SEED_PAYPAL_*` variables are set, and adds PayPal to every region whose currency it accepts. The seed runs it from `initial-data-seed.ts` |
| [`apps/storefront/package.json`](./apps/storefront/package.json) | Adds `@paypal/react-paypal-js` and the tunnel scripts |
| [`apps/storefront/.env.template`](./apps/storefront/.env.template) | Starts customers in the US region, which pays in a currency PayPal accepts |
| [`apps/storefront/messages/*.json`](./apps/storefront/messages) | Gives PayPal a subtitle in all 36 storefront locales |
| [`apps/storefront/src/lib/constants.tsx`](./apps/storefront/src/lib/constants.tsx) | Gives PayPal its English subtitle, holds the payment session back until the cart has an email, a delivery address and a shipping method, and hands the addresses and the email to the provider |
| [`apps/storefront/src/lib/data/paypal.ts`](./apps/storefront/src/lib/data/paypal.ts) | Reads the public PayPal settings and the buyer of an approved order from the plugin's store routes |
| [`apps/storefront/src/modules/checkout/components/paypal-scope/index.tsx`](./apps/storefront/src/modules/checkout/components/paypal-scope/index.tsx) | Loads the PayPal JS SDK with the client ID and the intent from the backend and the cart's currency |
| [`apps/storefront/src/modules/checkout/components/express-checkout/buttons/paypal.tsx`](./apps/storefront/src/modules/checkout/components/express-checkout/buttons/paypal.tsx) | The PayPal button of the express checkout row, listed in `registry.ts` next to it |
| [`apps/storefront/src/modules/checkout/components/payment-button/providers/paypal.tsx`](./apps/storefront/src/modules/checkout/components/payment-button/providers/paypal.tsx) | The PayPal button at the payment step, which pays the PayPal order of the session the checkout started, or creates one at the click. `payment-button/index.tsx` picks it for PayPal |
