# `@gorgo/medusa-payment-tkassa` example

Example for the [@gorgo/medusa-payment-tkassa](https://www.npmjs.com/package/@gorgo/medusa-payment-tkassa)
plugin, scaffolded from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with pnpm.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites), pnpm v10+ included.
- A T-Kassa account - [sign in or create one](https://www.tbank.ru/kassa/?utm_source=partners_sme&utm_medium=prt.utl&utm_campaign=business.int_acquiring.7-3S975SBSY&partnerId=7-3S975SBSY&agentId=5-B6HGU9OD&agentSsoId=1316b7dd-3a90-4167-9d35-37910431a19c), a shop identifier `TerminalKey` and a secret `Password`.

## Configuration

Set up environment variables for both apps:

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

The terminal key and the password are not among them. This example registers T-Kassa through the
[Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so you fill them in from
Medusa Admin and they are stored encrypted. The backend only needs `INTEGRATION_ENCRYPTION_KEY`,
which `.env.template` already sets to `supersecret` for development.

## Installation & Development

Follow the [common instructions](../README.md#medusa-dtc-starter-examples) for a Medusa DTC Starter
example. They install the workspace, migrate the database, create the `admin@medusajs.com` user with
the password `supersecret`, seed the demo catalog and start both apps.

## Connecting T-Kassa

1. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations → T-Kassa**. Fill
   in the terminal key and the password under **Credentials**, then set auto-capture and the receipt
   parameters to match your shop. See
   [Manage T-Kassa Settings in Medusa Admin](https://docs.gorgojs.com/medusa-integrations/t-kassa/settings-beta).

2. The seed already lists T-Kassa among the payment providers of all 241 regions, so nothing to do
   here. A region you add by hand needs it too, under **Settings → Regions**, since a provider
   missing from the region never reaches the checkout.

3. Serve the backend over a public address and register the webhook, since T-Kassa reports the
   payment status to it:

   ```bash
   cd apps/backend
   pnpm dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-tkassa.loca.lt`, and the storefront has
   its own `pnpm dev:tunnel`. In the T-Kassa merchant account choose notifications **via HTTP
   protocol** and add the URL in this format:

   ```text
   https://{YOUR_MEDUSA_DOMAIN}/hooks/payment/tkassa_tkassa
   ```

   Over https the cart cookie has to be marked secure to survive the redirect back from the payment
   page, so uncomment `COOKIE_SECURE=true` in `apps/backend/.env` and set `NEXT_PUBLIC_BASE_URL` in
   `apps/storefront/.env.local` to the storefront's public address.

4. Fill a cart in the storefront, pick T-Kassa at the checkout and pay. T-Kassa sends the customer
   back to `/api/payment-return`, and the order is placed by whichever arrives first, that return or
   the webhook.

## What the Example Adds to the Starter

The starter ships the extension points and no payment provider of its own, so the whole integration
is eight files. Port them into your own storefront to get the same flow.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the integration provider `tkassa-1`, the plugin itself so the Admin build picks up its i18n, and the payment provider bound to that integration id |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `dev:local` for a locally published copy of the plugin |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_payment_tkassa` and documents `COOKIE_SECURE` |
| [`apps/backend/src/migration-scripts/lib/regions.ts`](./apps/backend/src/migration-scripts/lib/regions.ts) | Seeds T-Kassa as a payment provider of every region, next to manual payment |
| [`apps/storefront/src/lib/constants.tsx`](./apps/storefront/src/lib/constants.tsx) | Names the provider at the checkout and builds the session data T-Kassa needs (`SuccessURL` and `FailURL`, and the cart its receipt is generated from) |
| [`apps/storefront/src/modules/checkout/components/payment-button/providers/tkassa.tsx`](./apps/storefront/src/modules/checkout/components/payment-button/providers/tkassa.tsx) | Sends the customer to the `PaymentURL` the session carries |
| [`apps/storefront/src/app/api/payment-return/route.ts`](./apps/storefront/src/app/api/payment-return/route.ts) | Handles the return from the payment page and places the order unless the webhook got there first |
| [`apps/storefront/messages/*.json`](./apps/storefront/messages) | Names T-Kassa in all 36 storefront locales |

## How the Example Was Scaffolded

The tree comes from the starter at commit
[`f3823d8`](https://github.com/gorgojs/medusa-dtc-starter/commit/f3823d806005da72eb6e91b3221eeabefd0e912c),
generated with the Medusa CLI and then given the changes above:

```bash
pnpm dlx create-medusa-app@latest --repo-url https://github.com/gorgojs/medusa-dtc-starter --no-migrations
```

`--no-migrations` is deliberate. Without it the generator creates the admin user itself, which opens
a browser and asks a human to type a password, and only that human ends up knowing it. The generated
user would also take `admin@medusajs.com` from the one the instructions above create. Migrations, the
user and the seed all run after generation, from this example's own commands.

To refresh the example against a newer starter, generate it again and re-apply the eight files.
