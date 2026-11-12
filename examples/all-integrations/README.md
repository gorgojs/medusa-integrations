# Gorgo integrations example

Example combining ten [Gorgo Medusa](https://gorgojs.com) plugins in one backend, scaffolded from
the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter): payment through
[@gorgo/medusa-payment-tkassa](https://www.npmjs.com/package/@gorgo/medusa-payment-tkassa),
[@gorgo/medusa-payment-yookassa](https://www.npmjs.com/package/@gorgo/medusa-payment-yookassa),
[@gorgo/medusa-payment-robokassa](https://www.npmjs.com/package/@gorgo/medusa-payment-robokassa),
[@gorgo/medusa-payment-stripe](https://www.npmjs.com/package/@gorgo/medusa-payment-stripe),
[@gorgo/medusa-payment-paypal](https://www.npmjs.com/package/@gorgo/medusa-payment-paypal),
[@gorgo/medusa-payment-authorizenet](https://www.npmjs.com/package/@gorgo/medusa-payment-authorizenet)
and [@gorgo/medusa-payment-mollie](https://www.npmjs.com/package/@gorgo/medusa-payment-mollie),
fulfillment through
[@gorgo/medusa-fulfillment-apiship](https://www.npmjs.com/package/@gorgo/medusa-fulfillment-apiship),
ERP sync through [@gorgo/medusa-1c](https://www.npmjs.com/package/@gorgo/medusa-1c), and a product
feed through [@gorgo/medusa-feed-yandex](https://www.npmjs.com/package/@gorgo/medusa-feed-yandex). Unlike the
other examples this one is backend-only: nothing here reaches a shop's own storefront, so there is no
`apps/storefront`, installed from the workspace root with yarn.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- A T-Kassa account - [sign in or create one](https://www.tbank.ru/business/online-payments/internet-acquiring/?utm_source=partners_sme&utm_medium=prt.utl&utm_campaign=business.int_acquiring.7-3S975SBSY&partnerId=7-3S975SBSY&agentId=5-B6HGU9OD&agentSsoId=1316b7dd-3a90-4167-9d35-37910431a19c), a shop identifier `TerminalKey` and a secret `Password`.
- A YooKassa account – [sign in or create one](https://yookassa.ru/joinups/?source=ks), a shop identifier `shopId` and a key `secretKey`.
- A Robokassa account - [sign in or create one](https://login.robokassa.ru/reg?promoCode=gorgo), a shop identifier `MerchantLogin`, secret passwords `password1`, `password2` and for testing `testPassword1` and `testPassword2`.
- An ApiShip account - [sign in or create one](https://a.apiship.ru), and an API `token` from it.
- 1C needs no account of its own: it calls into this backend, not the other way around.
- A Stripe account in test mode, with the secret key and the publishable key from **Developers → API keys** in the [Stripe Dashboard](https://dashboard.stripe.com/)
- A PayPal Business account and an app in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/), with the client ID and the secret of its sandbox environment
- An [Authorize.net sandbox account](https://developer.authorize.net/hello_world/sandbox.html), with the API Login ID, the Transaction Key, the Public Client Key and the Signature Key from the Merchant Interface
- A [Mollie account](https://www.mollie.com/dashboard/signup) with a website profile and its test API key, which starts with `test_` and is under **Developers → API keys** in the Mollie Dashboard
- A [Yandex Market](https://partner.market.yandex.ru/) account to submit the feed to. Generating and serving it needs no account at all.

## Configuration

Set up environment variables for the backend:

```bash
cp apps/backend/.env.template apps/backend/.env
```

Every provider above except the Yandex feed registers through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so its credentials are
stored encrypted rather than read from the environment at runtime. The backend only needs
`INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to `supersecret` for development.
The Yandex feed takes no credentials. It needs `MEDUSA_BACKEND_URL`, the address the generated file
is served under, which `.env.template` sets to `http://localhost:9000` for development.

If you already have credentials for T-Kassa, YooKassa, Robokassa, ApiShip, Stripe, PayPal,
Authorize.net or Mollie, fill in the matching
`SEED_*` variables in `apps/backend/.env` before the next step — the seed migration script reads
them once and stores them through the Integration Module. Leave any of them blank to enter that
provider's credentials in Medusa Admin instead, under **Settings → Integrations**. 1C has no
credentials to seed; its sync settings (interval, chunk size, product attribute mappings) are
configured entirely in Admin.

The rest of each provider's configuration the seed writes either way — auto-capture and receipts on
the general taxation system without VAT for the three payment providers, and test mode, no cash on
delivery and 10×10×10cm/20g default package dimensions for ApiShip, capture right away for Stripe,
PayPal, Authorize.net and Mollie, the sandbox environment for PayPal and Authorize.net, and Google Pay
off for Authorize.net. They are demo values, so check them in Admin against what your own shop is
registered for. The seed also creates a Yandex Market feed under **Settings → Feeds**, named after
`STORE_NAME` and linking to `STOREFRONT_URL`.

The seed offers each payment provider only in the regions whose currency it accepts. T-Kassa,
YooKassa and Robokassa go to every region. Stripe and PayPal go to the regions in a currency on their
own lists. Authorize.net goes to the regions whose currency is `SEED_AUTHORIZENET_CURRENCY`, `usd` by
default, because an Authorize.net account has a single currency. Mollie goes to the euro regions,
because its test mode accepts euros only.

## Installation & Development

Follow the [common instructions](../README.md#installation--development). They install the
workspace, migrate the database, create the `admin@medusajs.com` user with the password
`supersecret`, seed the demo catalog and start the backend. There is no storefront to start here —
run everything from `apps/backend`.

## Connecting the Providers

1. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations**. The seed has
   filled every provider's behavior settings, and the credentials too for whichever `SEED_*`
   variables your `.env` carried. Fill in what is still empty under each provider's **Credentials**
   section. See each provider's own settings guide:
   [T-Kassa](https://docs.gorgojs.com/medusa-integrations/t-kassa/settings),
   [YooKassa](https://docs.gorgojs.com/medusa-integrations/yookassa/settings),
   [Robokassa](https://docs.gorgojs.com/medusa-integrations/robokassa/settings),
   [ApiShip](https://docs.gorgojs.com/medusa-integrations/apiship/settings),
   [1C](https://docs.gorgojs.com/medusa-integrations/1c-enterprise-catalog/settings),
   [Stripe](https://docs.gorgojs.com/medusa-integrations/stripe/settings),
   [PayPal](https://docs.gorgojs.com/medusa-integrations/paypal/settings),
   [Authorize.net](https://docs.gorgojs.com/medusa-integrations/authorizenet/settings),
   [Mollie](https://docs.gorgojs.com/medusa-integrations/mollie/settings).

2. The seed already lists every payment provider in the regions whose currency it accepts, so
   nothing to do there. A region you add by hand needs them too, under **Settings → Regions**, since
   a provider missing from the region never reaches an order.

3. Every payment provider reports payment status over the public internet, ApiShip's webhook works
   the same way, and Yandex fetches the feed from a public address too, so serve the backend over a
   public address before testing any of them:

   ```bash
   cd apps/backend
   yarn dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-all.loca.lt`. Register each provider's
   webhook against that address in its own dashboard, in the format its own settings guide above
   describes. Mollie's webhook URL reads
   `https://medusa-all.loca.lt/hooks/payment/mollie_mollie`, and `MEDUSA_BACKEND_URL` takes the
   tunnel address before you submit the feed.

4. With no storefront in this example, exercise each provider from the Admin or against the Store
   API directly — create a cart and a payment session for a payment provider, or a shipment for
   ApiShip — rather than through a checkout page.

## What the Example Adds to the Starter

The starter ships the extension points and no provider of its own, so the whole integration is nine
backend files, and no storefront at all.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers all nine integration providers, each plugin's own entry so the Admin build picks up its i18n, the fulfillment provider bound to `apiship-1`, the seven payment providers bound to `tkassa-1`/`yookassa-1`/`robokassa-1`/`stripe-1`/`paypal-1`/`authorizenet-1`/`mollie-1`, the Yandex feed module, and a local file provider that serves the generated feed in development |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the ten plugins, the tunnel scripts and `predev` to link locally published copies of the plugins before `dev` starts |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_all_integrations`, documents `COOKIE_SECURE` and `MEDUSA_BACKEND_URL`, and adds the optional `SEED_*` variables the seed reads for every provider with credentials |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Configures all nine integration providers through the Integration Module, the behavior settings always and the credentials when their `SEED_*` variables are set, adds each payment provider to the regions whose currency it accepts, and creates the Yandex Market feed, wired into the seed from `initial-data-seed.ts` |

Nothing in a storefront changes, because this example has none. Port these files into your own
project the same way a single-provider example's are ported, one provider at a time.
