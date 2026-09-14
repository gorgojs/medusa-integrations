# `@gorgo/medusa-payment-robokassa` example

Example for the [@gorgo/medusa-payment-robokassa](https://www.npmjs.com/package/@gorgo/medusa-payment-robokassa)
plugin, scaffolded from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter). The
backend lives in [`apps/backend`](./apps/backend) and the storefront in
[`apps/storefront`](./apps/storefront), both installed from the workspace root with pnpm.

## Prerequisites

- All the [common prerequisites](../README.md#prerequisites), pnpm v10+ included.
- A Robokassa account - [sign in or create one](https://login.robokassa.ru/reg?promoCode=gorgo), a shop identifier `MerchantLogin`, secret passwords `password1`, `password2` and for testing `testPassword1` and `testPassword2`.

## Configuration

Set up environment variables for both apps:

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

The merchant login and the passwords are not among them. This example registers Robokassa through
the [Integration Module](https://docs.gorgojs.com/medusa-modules/integration), so you fill them in
from Medusa Admin and they are stored encrypted. The backend only needs
`INTEGRATION_ENCRYPTION_KEY`, which `.env.template` already sets to `supersecret` for development.

## Installation & Development

Follow the [common instructions](../README.md#medusa-dtc-starter-examples) for a Medusa DTC Starter
example. They install the workspace, migrate the database, create the `admin@medusajs.com` user with
the password `supersecret`, seed the demo catalog and start both apps.

## Connecting Robokassa

1. Open the Admin at http://localhost:9000/app and go to **Settings → Integrations → Robokassa**.
   Fill in the merchant login, the hash algorithm and the passwords under **Credentials**, then set
   test mode, auto-capture and the receipt parameters to match your shop. See
   [Manage Robokassa Settings in Medusa Admin](https://docs.gorgojs.com/medusa-integrations/robokassa/settings-beta).

2. The seed already lists Robokassa among the payment providers of all 241 regions, so nothing to do
   here. A region you add by hand needs it too, under **Settings → Regions**, since a provider
   missing from the region never reaches the checkout.

3. Serve the backend over a public address and register the webhook, since Robokassa reports the
   payment status to it:

   ```bash
   cd apps/backend
   pnpm dev:tunnel
   ```

   The tunnel runs alongside the backend on `https://medusa-robokassa.loca.lt`, and the storefront
   has its own `pnpm dev:tunnel`. Under the shop settings in your Robokassa account set the method
   of sending data to the result URL to `GET` or `POST`, and supply the result URL in this format:

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
is eight files. Port them into your own storefront to get the same flow.

| File | Change |
|---|---|
| [`apps/backend/medusa-config.ts`](./apps/backend/medusa-config.ts) | Registers the integration provider `robokassa-1`, the plugin itself so the Admin build picks up its i18n, and the payment provider bound to that integration id |
| [`apps/backend/package.json`](./apps/backend/package.json) | Adds the plugin, the tunnel scripts and `dev:local` for a locally published copy of the plugin |
| [`apps/backend/.env.template`](./apps/backend/.env.template) | Points `DB_NAME` at `medusa_payment_robokassa` and documents `COOKIE_SECURE` and the tunnel origin |
| [`apps/backend/src/migration-scripts/lib/regions.ts`](./apps/backend/src/migration-scripts/lib/regions.ts) | Seeds Robokassa as a payment provider of every region, next to manual payment |
| [`apps/storefront/src/lib/constants.tsx`](./apps/storefront/src/lib/constants.tsx) | Names the provider at the checkout and builds the session data Robokassa needs (`SuccessUrl2` and `FailUrl2` with their methods, the buyer's email, the payment page language, and the cart its receipt is generated from) |
| [`apps/storefront/src/modules/checkout/components/payment-button/providers/robokassa.tsx`](./apps/storefront/src/modules/checkout/components/payment-button/providers/robokassa.tsx) | Sends the customer to the `paymentUrl` the session carries |
| [`apps/storefront/src/app/api/payment-return/route.ts`](./apps/storefront/src/app/api/payment-return/route.ts) | Handles the return from the payment page and places the order unless the webhook got there first |
| [`apps/storefront/messages/*.json`](./apps/storefront/messages) | Names Robokassa in all 36 storefront locales |

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
