# `@gorgo/medusa-payment-stripe` example

Example for the [@gorgo/medusa-payment-stripe](https://www.npmjs.com/package/@gorgo/medusa-payment-stripe)
plugin, scaffolded from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with yarn.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- A Stripe account in test mode, with the secret key and the publishable key from **Developers → API keys** in the [Stripe Dashboard](https://dashboard.stripe.com/)
- The [Stripe CLI](https://docs.stripe.com/stripe-cli), if you forward webhooks to the local backend instead of using a tunnel

## Configuration

Set up environment variables for both apps:

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

This example registers Stripe through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so its keys are stored
encrypted rather than read from the environment at runtime. The backend only needs
`INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to `supersecret` for development.
The storefront needs no Stripe variable, since it gets the publishable key from the backend.

If you already have the test keys, fill in `SEED_STRIPE_SECRET_KEY` and `SEED_STRIPE_PUBLISHABLE_KEY`
in `apps/backend/.env` before the next step, and `SEED_STRIPE_WEBHOOK_SECRET` once you have a webhook
signing secret. The seed migration script reads them once and stores them through the Integration
Module. Leave them blank to enter the keys in Medusa Admin instead, in
[Connecting Stripe](#connecting-stripe) below.

The seed writes the capture mode either way, capture right away. It offers Stripe in every seeded
region whose currency Stripe accepts.

## Installation & Development

Follow the [common instructions](../README.md#installation--development). They install the workspace,
migrate the database, create the `admin@medusajs.com` user with the password `supersecret`, seed the
demo catalog and start both apps.

## Connecting Stripe

1. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations → Stripe**. Fill
   in the secret key and the publishable key under **Credentials** if the seed did not, and press
   **Test connection**. It checks the secret key against Stripe and, once a webhook signing secret
   is set, that an enabled webhook endpoint for Medusa exists in the same mode and sends the events
   the plugin needs. See
   [Manage Stripe Settings in Medusa Admin](https://docs.gorgojs.com/medusa-integrations/stripe/settings).

2. The seed already lists Stripe among the payment providers of every region whose currency Stripe
   accepts. A region you add by hand needs it too, under **Settings → Regions**, since a provider
   missing from the region never reaches the checkout.

3. Stripe reports payments to the backend through a webhook, so give the backend a public address
   and register the webhook:

   ```bash
   cd apps/backend
   yarn dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-stripe.loca.lt`, and the storefront has
   its own `yarn dev:tunnel`. In the Stripe Dashboard, add a webhook endpoint with a URL in this
   format, subscribed to `payment_intent.succeeded` and
   `payment_intent.amount_capturable_updated`:

   ```text
   https://{YOUR_MEDUSA_DOMAIN}/hooks/payment/stripe_stripe
   ```

   Then put its signing secret, which starts with `whsec_`, into **Webhook signing secret** in the
   Admin. Without it the backend cannot verify Stripe's webhooks and ignores them.

   Without a tunnel, the Stripe CLI forwards Stripe's events to the local backend:

   ```bash
   stripe listen --forward-to localhost:9000/hooks/payment/stripe_stripe
   ```

   It prints a signing secret that starts with `whsec_`. Put it into **Webhook signing secret** in
   the Admin. The CLI creates no endpoint in the Dashboard, so **Test connection** reports the
   missing endpoint while the events still arrive.

4. Fill a cart in the storefront and pay with a test card from
   [Stripe's testing guide](https://docs.stripe.com/testing). Stripe shows in two places. The
   express checkout row above the form offers Apple Pay, Google Pay and Link, and stays empty where
   the browser and the Stripe account offer none of them. The address you pick in the wallet window
   recalculates the shipping and the total, and the order is placed once you approve. At the payment
   step, the Payment Element shows the payment methods your Stripe account enables, and the pay
   button creates the PaymentIntent with the final amount and the delivery address. When the tab
   closes after Stripe has taken the payment, the `payment_intent.succeeded` webhook still places the
   order. With capture set to **Authorize only**, you capture the payment from the order in the
   Admin, and the `payment_intent.amount_capturable_updated` webhook places the order.

## What the Example Adds to the Starter

The starter ships the express checkout row, the payment extension points and a Stripe card form that
takes its publishable key from `NEXT_PUBLIC_STRIPE_KEY` and creates the PaymentIntent when the
customer picks the method. The example moves that to a deferred PaymentIntent, so the integration is
the files below. Port them into your own storefront to get the same flow.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the integration provider `stripe-1`, the plugin itself so the Admin build picks up its i18n, and the payment provider bound to that integration id |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `predev` to link a locally published copy of the plugin before `dev` starts |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_payment_stripe` and adds the optional `SEED_STRIPE_SECRET_KEY`, `SEED_STRIPE_PUBLISHABLE_KEY` and `SEED_STRIPE_WEBHOOK_SECRET` the seed reads |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Configures Stripe through the Integration Module with capture right away, adds the keys when the `SEED_STRIPE_*` variables are set, and adds Stripe to every region whose currency it accepts. The seed runs it from `initial-data-seed.ts` through the export added to `lib/index.ts` |
| [`apps/storefront/package.json`](./apps/storefront/package.json) | Pins `@stripe/react-stripe-js` to 7.0.0 and `@stripe/stripe-js` to 10.1.0, and adds the tunnel scripts |
| [`apps/storefront/.env.template`](./apps/storefront/.env.template) | Replaces `NEXT_PUBLIC_STRIPE_KEY` with a note that the publishable key comes from the Admin through `GET /store/stripe/config` |
| [`apps/storefront/README.md`](./apps/storefront/README.md) | Drops `NEXT_PUBLIC_STRIPE_KEY` and the two Medusa Payments variables from the environment table |
| [`apps/storefront/messages/*.json`](./apps/storefront/messages) | Gives Stripe the title `Stripe` and a translated subtitle in all 36 storefront locales |
| [`apps/storefront/src/lib/constants.tsx`](./apps/storefront/src/lib/constants.tsx) | Gives Stripe its English title and subtitle, and marks it `deferred`, so picking Stripe starts no payment session and the pay button starts it |
| [`apps/storefront/src/lib/data/stripe.ts`](./apps/storefront/src/lib/data/stripe.ts) | Reads the publishable key, the capture method and the payment method configuration from the plugin's store route, cached for a minute, and returns `null` while Stripe is not configured |
| [`apps/storefront/src/lib/util/stripe-amount.ts`](./apps/storefront/src/lib/util/stripe-amount.ts) | Converts a Medusa amount to Stripe's integer the way the plugin does, so the Elements and the PaymentIntent agree on the amount |
| [`apps/storefront/src/app/[locale]/(checkout)/checkout/page.tsx`](./apps/storefront/src/app/%5Blocale%5D/%28checkout%29/checkout/page.tsx) | Loads the Stripe settings and the cart's region payment methods, and passes the settings on only where the region takes Stripe |
| [`apps/storefront/src/modules/checkout/components/payment-wrapper/index.tsx`](./apps/storefront/src/modules/checkout/components/payment-wrapper/index.tsx) | Wraps the whole checkout in the Stripe Elements when the settings are present and the cart total is above zero, instead of waiting for a pending payment session |
| [`apps/storefront/src/modules/checkout/components/payment-wrapper/stripe-wrapper.tsx`](./apps/storefront/src/modules/checkout/components/payment-wrapper/stripe-wrapper.tsx) | Creates the Elements in deferred mode with the cart's amount and currency, the capture method and the payment method configuration, and no client secret. Loads Stripe.js once per publishable key |
| [`apps/storefront/src/modules/checkout/components/payment-container/index.tsx`](./apps/storefront/src/modules/checkout/components/payment-container/index.tsx) | Moves the Payment Element into its own `StripePaymentElement`, without the radio option `StripePaymentContainer` wraps it in, and hides its billing address fields, since the checkout already has the address and passes it on at confirmation |
| [`apps/storefront/src/modules/checkout/components/checkout-payment-section/index.tsx`](./apps/storefront/src/modules/checkout/components/checkout-payment-section/index.tsx) | Shows `StripePaymentElement` under the payment method tiles. The one-screen checkout has no radio group, and the radio option of `StripePaymentContainer` fails without one |
| [`apps/storefront/src/modules/checkout/components/payment-button/index.tsx`](./apps/storefront/src/modules/checkout/components/payment-button/index.tsx) | Passes the selected provider id to the Stripe pay button |
| [`apps/storefront/src/modules/checkout/components/payment-button/providers/stripe.tsx`](./apps/storefront/src/modules/checkout/components/payment-button/providers/stripe.tsx) | The Stripe pay button, which validates the form, starts the payment session to create the PaymentIntent, and confirms it with the session's client secret and the billing details from the cart |
| [`apps/storefront/src/modules/checkout/components/express-checkout/buttons/stripe.tsx`](./apps/storefront/src/modules/checkout/components/express-checkout/buttons/stripe.tsx) | The Stripe button of the express checkout row, listed in `registry.ts` next to it. It shows Apple Pay, Google Pay and Link through the Express Checkout Element, quotes the shipping when the address changes in the wallet window, and on approval saves the contact, creates and confirms the PaymentIntent and places the order |
