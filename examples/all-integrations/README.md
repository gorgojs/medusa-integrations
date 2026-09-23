# Gorgo integrations example

Example combining five [Gorgo Medusa](https://gorgojs.com) plugins in one backend, scaffolded from
the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter): payment through
[@gorgo/medusa-payment-tkassa](https://www.npmjs.com/package/@gorgo/medusa-payment-tkassa),
[@gorgo/medusa-payment-yookassa](https://www.npmjs.com/package/@gorgo/medusa-payment-yookassa) and
[@gorgo/medusa-payment-robokassa](https://www.npmjs.com/package/@gorgo/medusa-payment-robokassa),
fulfillment through
[@gorgo/medusa-fulfillment-apiship](https://www.npmjs.com/package/@gorgo/medusa-fulfillment-apiship),
and ERP sync through [@gorgo/medusa-1c](https://www.npmjs.com/package/@gorgo/medusa-1c). Unlike the
other examples this one is backend-only: nothing here reaches a shop's own storefront, so there is no
`apps/storefront`, installed from the workspace root with yarn.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites)
- A T-Kassa account - [sign in or create one](https://www.tbank.ru/kassa/?utm_source=partners_sme&utm_medium=prt.utl&utm_campaign=business.int_acquiring.7-3S975SBSY&partnerId=7-3S975SBSY&agentId=5-B6HGU9OD&agentSsoId=1316b7dd-3a90-4167-9d35-37910431a19c), a shop identifier `TerminalKey` and a secret `Password`.
- A YooKassa account – [sign in or create one](https://yookassa.ru/joinups/?source=ks), a shop identifier `shopId` and a key `secretKey`.
- A Robokassa account - [sign in or create one](https://login.robokassa.ru/reg?promoCode=gorgo), a shop identifier `MerchantLogin`, secret passwords `password1`, `password2` and for testing `testPassword1` and `testPassword2`.
- An ApiShip account - [sign in or create one](https://a.apiship.ru), and an API `token` from it.
- 1C needs no account of its own: it calls into this backend, not the other way around.

## Configuration

Set up environment variables for the backend:

```bash
cp apps/backend/.env.template apps/backend/.env
```

Every provider above registers through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so its credentials are
stored encrypted rather than read from the environment at runtime. The backend only needs
`INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to `supersecret` for development.

If you already have credentials for T-Kassa, YooKassa, Robokassa or ApiShip, fill in the matching
`SEED_*` variables in `apps/backend/.env` before the next step — the seed migration script reads
them once and stores them through the Integration Module. Leave any of them blank to enter that
provider's credentials in Medusa Admin instead, under **Settings → Integrations**. 1C has no
credentials to seed; its sync settings (interval, chunk size, product attribute mappings) are
configured entirely in Admin.

The rest of each provider's configuration the seed writes either way — auto-capture and receipts on
the general taxation system without VAT for the three payment providers, and test mode, no cash on
delivery and 10×10×10cm/20g default package dimensions for ApiShip. They are demo values, so check
them in Admin against what your own shop is registered for.

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
   [1C](https://docs.gorgojs.com/medusa-integrations/1c-enterprise/settings).

2. The seed already lists T-Kassa, YooKassa and Robokassa among the payment providers of all 241
   regions, so nothing to do there. A region you add by hand needs them too, under
   **Settings → Regions**, since a provider missing from the region never reaches an order.

3. T-Kassa, YooKassa and Robokassa report payment status over the public internet, and ApiShip's
   webhook works the same way, so serve the backend over a public address before testing any of
   them:

   ```bash
   cd apps/backend
   yarn dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-all.loca.lt`. Register each provider's
   webhook against that address in its own dashboard, in the format its own settings guide above
   describes.

4. With no storefront in this example, exercise each provider from the Admin or against the Store
   API directly — create a cart and a payment session for a payment provider, or a shipment for
   ApiShip — rather than through a checkout page.

## What the Example Adds to the Starter

The starter ships the extension points and no provider of its own, so the whole integration is nine
backend files, and no storefront at all.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers all five integration providers, each plugin's own entry so the Admin build picks up its i18n, the fulfillment provider bound to `apiship-1`, and the three payment providers bound to `tkassa-1`/`yookassa-1`/`robokassa-1` |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the five plugins, the tunnel scripts and `predev` to link locally published copies of the plugins before `dev` starts |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_all_integrations`, documents `COOKIE_SECURE`, and adds the optional `SEED_TKASSA_*`/`SEED_YOOKASSA_*`/`SEED_ROBOKASSA_*`/`SEED_APISHIP_TOKEN` variables the seed reads |
| [`apps/backend/src/migration-scripts/lib/regions.ts`](./apps/backend/src/migration-scripts/lib/regions.ts) | Seeds T-Kassa, YooKassa and Robokassa as payment providers of every region, next to manual payment |
| [`apps/backend/src/migration-scripts/lib/example-data.ts`](./apps/backend/src/migration-scripts/lib/example-data.ts) | Configures all five providers through the Integration Module, the behavior settings always and the credentials when their `SEED_*` variables are set, wired into the seed from `initial-data-seed.ts` |

Nothing in a storefront changes, because this example has none. Port these files into your own
project the same way a single-provider example's are ported, one provider at a time.
