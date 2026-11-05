# `@gorgo/medusa-payment-authorizenet` example

Example for the [@gorgo/medusa-payment-authorizenet](https://www.npmjs.com/package/@gorgo/medusa-payment-authorizenet)
plugin, built from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with yarn.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- An [Authorize.net sandbox account](https://developer.authorize.net/hello_world/sandbox.html), with the API Login ID, the Transaction Key, the Public Client Key and the Signature Key from the Merchant Interface. The keys are under **Account → Settings**: **API Credentials & Keys** holds the first two and the Signature Key, **Security Settings → Manage Public Client Key** the third
- A tunnel to the local backend, such as `yarn dev:tunnel` below, if you register a webhook in Authorize.net

## Configuration

Set up environment variables for both apps:

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

This example registers Authorize.net through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so its keys are stored
encrypted rather than read from the environment at runtime. The backend only needs
`INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to `supersecret` for development.

If you already have the sandbox keys, fill in `SEED_AUTHORIZENET_API_LOGIN_ID`,
`SEED_AUTHORIZENET_TRANSACTION_KEY` and `SEED_AUTHORIZENET_CLIENT_KEY` in `apps/backend/.env` before
the next step, and `SEED_AUTHORIZENET_SIGNATURE_KEY` once you have a Signature Key. The seed migration
script reads them once and stores them through the Integration Module. Leave them blank to enter the
keys in Medusa Admin instead, in [Connecting Authorize.net](#connecting-authorizenet) below.

The seed writes the sandbox environment, capture right away and Google Pay off either way. An
Authorize.net account has a single currency, so the seed offers Authorize.net only in the regions
whose currency is `SEED_AUTHORIZENET_CURRENCY`, `usd` by default. Set it to the currency of your
account before the seed runs if that is another one.

## Installation & Development

Follow the [common instructions](../README.md#installation--development). They install the workspace,
migrate the database, create the `admin@medusajs.com` user with the password `supersecret`, seed the
demo catalog and start both apps.

## Connecting Authorize.net

1. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations → Authorize.net**.
   Fill in the API Login ID, the Transaction Key and the Public Client Key under **Credentials** if
   the seed did not, keep **Environment** on **Sandbox**, and press **Test connection**. It reads
   the account with the keys and, once a Signature Key is set, checks that an active webhook for
   Medusa exists and sends the events the plugin needs.

2. Put the sandbox account into Live Mode. An account in Test Mode keeps no transactions, and
   **Test connection** reports it as failed. Switch it in the sandbox Merchant Interface under
   **Account → Settings → Test Mode**.

3. The seed already lists Authorize.net among the payment providers of every region whose currency
   is `SEED_AUTHORIZENET_CURRENCY`. A region you add by hand needs it too, under
   **Settings → Regions**, since a provider missing from the region never reaches the checkout.

4. Authorize.net reports some payments to the backend through a webhook, so give the backend a public
   address and register the webhook:

   ```bash
   cd apps/backend
   yarn dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-authorizenet.loca.lt`. Register a webhook
   in the Authorize.net Merchant Interface, or through the REST API with `POST /rest/v1/webhooks`,
   with a URL in this format, subscribed to `net.authorize.payment.fraud.approved`,
   `net.authorize.payment.fraud.declined` and `net.authorize.payment.priorAuthCapture.created`:

   ```text
   https://{YOUR_MEDUSA_DOMAIN}/hooks/payment/authorizenet_authorizenet
   ```

   Then put the Signature Key from **Account → Settings → API Credentials & Keys** into **Signature
   Key** in the Admin. Without it the backend cannot verify Authorize.net's webhooks and ignores
   them.

5. Fill a cart in the storefront with a shipping address in the United States, with a state and a
   ZIP code, and pay with the sandbox test card `4111 1111 1111 1111` and any future expiry date and
   CVC. With **Payment capture** set to **Authorize only** in the Admin, the order is placed with the
   amount held and you capture the payment from the order in the Admin. Google Pay is off in the
   seed. Switch it on under **Express checkout** in the integration's settings. Its production
   environment also needs your Google merchant ID.

## What the Example Adds to the Starter

The example is the starter with the plugin wired in. The files below are what changes outside the
starter's own code. Port them into your own project to get the same setup.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the integration provider `authorizenet-1`, the plugin itself so the Admin build picks up its i18n, and the payment provider `authorizenet` bound to that integration id |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `predev` to link a locally published copy of the plugin before `dev` starts |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_payment_authorizenet` and adds the optional `SEED_AUTHORIZENET_API_LOGIN_ID`, `SEED_AUTHORIZENET_TRANSACTION_KEY`, `SEED_AUTHORIZENET_CLIENT_KEY`, `SEED_AUTHORIZENET_SIGNATURE_KEY` and `SEED_AUTHORIZENET_CURRENCY` the seed reads |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Configures Authorize.net through the Integration Module for the sandbox with capture right away and Google Pay off, adds the keys when the `SEED_AUTHORIZENET_*` variables are set, and adds Authorize.net to every region whose currency is `SEED_AUTHORIZENET_CURRENCY`. The seed runs it from `initial-data-seed.ts` through the export added to `lib/index.ts` |
| [`apps/storefront/package.json`](./apps/storefront/package.json) | Adds `@google-pay/button-react` at 4.1.0 |
| [`apps/storefront/src/lib/constants.tsx`](./apps/storefront/src/lib/constants.tsx) | Adds `isAuthorizeNet`, the method's label and a `deferred` entry in `paymentSessionDataBuilders`, so picking Authorize.net starts no payment session |
| [`apps/storefront/src/lib/data/authorizenet.ts`](./apps/storefront/src/lib/data/authorizenet.ts) | Reads the API Login ID, the Public Client Key and the Google Pay settings from `GET /store/authorizenet/config` |
| [`apps/storefront/src/lib/util/card.ts`](./apps/storefront/src/lib/util/card.ts), [`accept-js.ts`](./apps/storefront/src/lib/util/accept-js.ts) | Format and check the card fields, and turn them into a one-time token with Accept.js |
| [`apps/storefront/src/app/[locale]/(checkout)/checkout/page.tsx`](./apps/storefront/src/app/[locale]/(checkout)/checkout/page.tsx) | Loads the settings for a region that takes Authorize.net and passes them to the payment wrapper |
| [`apps/storefront/src/modules/checkout/components/payment-wrapper/`](./apps/storefront/src/modules/checkout/components/payment-wrapper/) | `authorizenet-wrapper.tsx` loads Accept.js and shares the card fields between the form and the pay button |
| [`apps/storefront/src/modules/checkout/components/authorizenet-card-form/index.tsx`](./apps/storefront/src/modules/checkout/components/authorizenet-card-form/index.tsx) | The card number, expiry date and security code fields, shown in the payment section when Authorize.net is picked |
| [`apps/storefront/src/modules/checkout/components/checkout-payment-section/index.tsx`](./apps/storefront/src/modules/checkout/components/checkout-payment-section/index.tsx) | Shows the card form under the payment methods |
| [`apps/storefront/src/modules/checkout/components/payment-button/`](./apps/storefront/src/modules/checkout/components/payment-button/) | `providers/authorizenet.tsx` checks the card, gets the token, starts the session with it and places the order |
| [`apps/storefront/src/modules/order/components/payment-details/index.tsx`](./apps/storefront/src/modules/order/components/payment-details/index.tsx) | Shows the last four digits of the card on the order page |
| [`apps/storefront/messages/*.json`](./apps/storefront/messages/) | The method's label and the card form's strings in all 36 locales |
