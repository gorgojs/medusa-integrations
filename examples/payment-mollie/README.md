# `@gorgo/medusa-payment-mollie` example

Example for the [@gorgo/medusa-payment-mollie](https://www.npmjs.com/package/@gorgo/medusa-payment-mollie)
plugin, built from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with yarn.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- A [Mollie account](https://www.mollie.com/dashboard/signup) with a website profile and its test API key, which starts with `test_` and is under **Developers → API keys** in the Mollie Dashboard
- A tunnel to the local backend, such as `yarn dev:tunnel` below. Mollie cannot call `localhost`, so the webhook needs a public `https://` address

## Configuration

Set up environment variables for both apps:

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

This example registers Mollie through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so the API key is stored
encrypted rather than read from the environment at runtime. The backend only needs
`INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to `supersecret` for development.

If you already have the test key, fill in `SEED_MOLLIE_API_KEY` and `SEED_MOLLIE_WEBHOOK_URL` in
`apps/backend/.env` before the next step. The seed migration script reads them once and stores them
through the Integration Module. Leave them blank to enter both in Medusa Admin instead, in
[Connecting Mollie](#connecting-mollie) below.

`SEED_MOLLIE_WEBHOOK_URL` is the public address of the backend followed by
`/hooks/payment/mollie_mollie`. With the tunnel from this example it reads
`https://medusa-mollie.loca.lt/hooks/payment/mollie_mollie`.

The seed sets payment capture to automatic. It also offers Mollie only in the regions whose currency
is the euro, because Mollie's test mode accepts euros only. The storefront starts in the Netherlands
(`NEXT_PUBLIC_DEFAULT_REGION=nl`), which is such a region, so iDEAL is among the methods you see on
Mollie's page.

## Installation & Development

Follow the [common instructions](../README.md#installation--development). They install the workspace,
migrate the database, create the `admin@medusajs.com` user with the password `supersecret`, seed the
demo catalog and start both apps.

## Connecting Mollie

1. Start the tunnel next to the backend, so Mollie has an address to call:

   ```bash
   cd apps/backend
   yarn dev:tunnel
   ```

   It runs the backend and the tunnel together, and the tunnel answers on
   `https://medusa-mollie.loca.lt`.

2. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations → Mollie**. Fill
   in **API key** and **Webhook URL** if the seed did not, and press **Test connection**. It reads
   the website profile the key belongs to and shows its mode, so a `test_` key reports the test mode.

3. The seed already lists Mollie among the payment providers of every region whose currency is the
   euro. A region you add by hand needs it too, under **Settings → Regions**, since a provider
   missing from the region never reaches the checkout. Mollie takes no other currency in test mode.

4. Fill a cart in the storefront with a shipping address in a country of a euro region, such as the
   Netherlands, and pick **Mollie** at the checkout. The method is greyed out until the cart has an
   email, an address and a shipping method. The button takes the customer to Mollie's payment page,
   where the test mode lets you choose the outcome of each method, for example **Paid** or
   **Failed**. After paying, the customer comes back through `/api/payment-return`, and the order is
   placed there or by Mollie's webhook, whichever arrives first.

5. A Mollie payment that nobody pays expires, a card payment after 30 minutes. If the customer comes
   back to the checkout later, the button starts a new payment and sends them to its page.

## What the Example Adds to the Starter

The example is the starter with the plugin wired in. The files below are what changes outside the
starter's own code. Port them into your own project to get the same setup.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the integration provider `mollie-1`, the plugin itself so the Admin build picks up its i18n, and the payment provider `mollie` bound to that integration id |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `predev` to link a locally published copy of the plugin before `dev` starts |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_payment_mollie` and adds the optional `SEED_MOLLIE_API_KEY` and `SEED_MOLLIE_WEBHOOK_URL` the seed reads |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Configures Mollie through the Integration Module with capture right away, adds the key and the webhook URL when the `SEED_MOLLIE_*` variables are set, and adds Mollie to every region whose currency is the euro. The seed runs it from `initial-data-seed.ts` through the export added to `lib/index.ts` |
| [`apps/storefront/.env.template`](./apps/storefront/.env.template) | Starts the storefront in the Netherlands, a euro region |
| [`apps/storefront/src/lib/constants.tsx`](./apps/storefront/src/lib/constants.tsx) | Adds `isMollie`, the method's label, `paymentReturnUrl` and an entry in `paymentSessionDataBuilders` that starts the session once the cart has an email, an address and a shipping method, and sends the return address and the page language |
| [`apps/storefront/src/modules/checkout/components/payment-button/`](./apps/storefront/src/modules/checkout/components/payment-button/) | `providers/mollie.tsx` sends the customer to the payment page and starts a new session when the payment has expired, and `index.tsx` picks it for Mollie |
| [`apps/storefront/src/app/api/payment-return/route.ts`](./apps/storefront/src/app/api/payment-return/route.ts) | Handles the return from Mollie's page, which carries only the cart id, and places the order unless the webhook did |
| [`apps/storefront/src/modules/order/components/payment-details/index.tsx`](./apps/storefront/src/modules/order/components/payment-details/index.tsx) | Shows the last four digits of the card on the order page |
| [`apps/storefront/messages/*.json`](./apps/storefront/messages/) | The method's label in all 36 locales |
