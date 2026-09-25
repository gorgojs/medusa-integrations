# `@gorgo/medusa-fulfillment-apiship` example

Example for the [@gorgo/medusa-fulfillment-apiship](https://www.npmjs.com/package/@gorgo/medusa-fulfillment-apiship)
plugin, scaffolded from the [Medusa DTC Starter by Gorgo](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with yarn.

ApiShip aggregates Russian carriers, so the example shows the whole checkout flow that needs, a
courier tariff picked from a list and a pickup point picked from a map.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- An ApiShip account – [sign in or create one](https://a.apiship.ru), and an API token
- A Yandex Maps JavaScript API key for the pickup point map – [create one](https://developer.tech.yandex.ru)
  under "JavaScript API and Geocoder"

## Configuration

Set up environment variables for both apps:

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

This example registers ApiShip through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so its token is stored
encrypted rather than read from the environment at runtime. The backend only needs
`INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to `supersecret` for development.

If you already have an ApiShip account, fill in `SEED_APISHIP_TOKEN` in `apps/backend/.env` before
the next step. The seed migration script reads it once and stores it through the Integration Module.
Leave it blank to enter the token in Medusa Admin instead, in [Connecting ApiShip](#connecting-apiship)
below. `SEED_APISHIP_IS_TEST` stays on, which points the plugin at ApiShip's test environment where
the calculator answers with demo tariffs and nothing is charged.

Put your Yandex Maps key into `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` in `apps/storefront/.env.local`.
Without it the courier options still work and the pickup point map says the key is missing.

The rest of the configuration the seed writes either way, the default parcel size and weight and the
sender details taken from the seeded Moscow warehouse. They are demo values, so check them in Admin
against what you actually ship.

## Installation & Development

Follow the [common instructions](../README.md#installation--development). They install the workspace,
migrate the database, create the `admin@medusajs.com` user with the password `supersecret`, seed the
demo catalog and start both apps.

## Connecting ApiShip

1. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations → ApiShip**. The
   seed has filled every setting, and the token too when your `.env` carried it. Fill in the token
   under **Credentials** if it is still empty, then check the sender address, the payment and VAT
   settings and the default product sizes against your own shop. See
   [Manage ApiShip Settings in Medusa Admin](https://docs.gorgojs.com/medusa-integrations/apiship/settings).

2. Add a connection in the **Connections** section for each delivery service you have an ApiShip
   contract with, and enable it. A tariff only reaches the checkout through an enabled connection,
   so until there is one the calculator answers with nothing and the checkout shows no ApiShip
   options.

3. The seed replaced the starter's flat-rate options in the Russian region with two ApiShip ones, so
   the Moscow warehouse ships through ApiShip only:

   | Option | Route |
   |---|---|
   | Доставка курьером | Picked up at the warehouse, delivered to the door |
   | Самовывоз | Picked up at the warehouse, delivered to a pickup point |

   Their names are translated into all 36 seeded locales, with the same strings the starter uses for
   its own courier and pickup options. ApiShip can also take a parcel you drop off at an intake
   point. Those routes need a connection with an intake point assigned, so the seed leaves them out.
   Add them under **Settings → Locations & Shipping** once that connection exists.

4. Open the storefront at http://localhost:8000, switch to the Russian region, fill a cart and go to
   the checkout. The contacts ask for a phone number, which ApiShip needs to quote and to book. The
   checkout selects Доставка курьером on its own, and the row under the options opens a two-step
   sheet: the address first, then the tariff list, or the pickup point map for Самовывоз. Payment
   stays disabled until the tariff, and for Самовывоз the pickup point, is picked.

## What the Example Adds to the Starter

The starter ships the extension points and no fulfillment provider of its own, so the whole
integration is the files below. Port them into your own storefront to get the same flow.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the integration provider `apiship-1`, the plugin itself so the Admin build picks up its settings page and i18n, and the fulfillment provider bound to that integration id |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `predev` to link a locally published copy of the plugin before `dev` starts |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_fulfillment_apiship` and adds the `SEED_APISHIP_TOKEN` and `SEED_APISHIP_IS_TEST` pair the seed reads |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Configures ApiShip through the Integration Module, links the fulfillment provider to the Moscow warehouse, replaces the starter's shipping options in the Russian region with the two ApiShip ones and translates their names, wired into the seed from `initial-data-seed.ts` |
| [`apps/storefront/src/lib/data/fulfillment.ts`](./apps/storefront/src/lib/data/fulfillment.ts) | Calls the plugin's store routes, the calculator, the pickup points and the carrier names |
| [`apps/storefront/src/lib/data/cart.ts`](./apps/storefront/src/lib/data/cart.ts) | Adds `removeShippingMethodFromCart`, which takes the shipping method off the cart through the plugin's store route |
| [`apps/storefront/src/lib/constants.tsx`](./apps/storefront/src/lib/constants.tsx) | Registers ApiShip with the starter's shipping options: priced by the customer's choice, ready once the tariff and, for a pickup point, the point are picked, and taken off the cart through `removeShippingMethodFromCart` |
| [`apps/storefront/src/modules/checkout/components/apiship/`](./apps/storefront/src/modules/checkout/components/apiship) | The two-step delivery sheet, the tariff list, the pickup point map, and the types and helpers they share |
| [`apps/storefront/src/modules/checkout/components/shipping-option/`](./apps/storefront/src/modules/checkout/components/shipping-option) | The ApiShip card, which shows the dates and price of the picked tariff, and its case in the card dispatcher |
| [`apps/storefront/src/modules/checkout/components/delivery-row/`](./apps/storefront/src/modules/checkout/components/delivery-row) | The ApiShip row, which shows the address or the pickup point and opens the delivery sheet, and its case in the row dispatcher |
| [`apps/storefront/src/modules/checkout/components/checkout-contacts-sheet/index.tsx`](./apps/storefront/src/modules/checkout/components/checkout-contacts-sheet/index.tsx) | Requires the phone number, which ApiShip needs to quote and to book |
| [`apps/storefront/.env.template`](./apps/storefront/.env.template) | Adds `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` and starts customers in the Russian region |
| [`apps/storefront/messages/*.json`](./apps/storefront/messages) | The checkout strings this flow adds, in all 36 storefront locales |
