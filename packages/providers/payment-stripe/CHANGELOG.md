# @gorgo/medusa-payment-stripe

## 2.1.0

### Highlights

- **Upgrade to Integration Module 2.0.** This release requires [`@gorgo/medusa-integration`](https://www.npmjs.com/package/@gorgo/medusa-integration) 2.x, which needs Medusa v2.21.0 or later. Update both packages in one step, `yarn add @gorgo/medusa-integration@^2.0.0 @gorgo/medusa-payment-stripe@^2.1.0`, then run `npx medusa db:migrate`, which adds the change history and moves the settings of a registration without an `id` to the key of the instance `default`, and restart the server. The plugin's settings and the storefront integration keep working as they are. The [upgrade guide](https://docs.gorgojs.com/medusa-modules/integration/changelog) of the module lists what to check in your own code.
- **Change history of the settings.** The Integration Module records who changed which Stripe settings and when, with the value before and after. Secrets stay out of it. The **Change History** section of the integration's page shows the five latest changes, and the **Change History** page under **Settings → Integrations** lists every change, with a search and filters by integration, event, author, and date.
- **Search by name.** The **Integrations** page finds the integration by its name in the interface language, not only by its identifier.
- **Everything else in 2.0.** Metadata and a **JSON** section on the integration's page, secrets stored with a format version, startup warnings for provider authors, the renamed `AbstractIntegrationProviderService`, and the rewritten documentation are in the [module's changelog](https://docs.gorgojs.com/medusa-modules/integration/changelog).

### Features

- move the admin translations to the gorgo namespace by [@KaneFlak](https://github.com/KaneFlak) in [`8098d63`](https://github.com/gorgojs/medusa-integrations/commit/8098d63a6b4c516df11ecb7ff48fcb304bebae85)

### Dependencies

- Updated dependencies:
  - @gorgo/medusa-integration@2.0.0

## 2.0.3

### Documentation

- show the medusa-config registration in the readme by [@ttokyose](https://github.com/ttokyose) in [#521](https://github.com/gorgojs/medusa-integrations/pull/521) ([`598245d`](https://github.com/gorgojs/medusa-integrations/commit/598245ddd374177258ba9283baa0ba70222f9620))

## 2.0.2

### Documentation

- link the maintenance page from the readme by [@gorgohead](https://github.com/gorgohead) in [`2fb0875`](https://github.com/gorgojs/medusa-integrations/commit/2fb08758227db11067eca108c387e67863cb8f24)

## 2.0.1

### Documentation

- align the readme with the other payment plugins by [@gorgohead](https://github.com/gorgohead) in [#514](https://github.com/gorgojs/medusa-integrations/pull/514) ([`443af4d`](https://github.com/gorgojs/medusa-integrations/commit/443af4d9b54cffdfef91a643187fa9758526f513))

### Dependencies

- Updated dependencies:
  - @gorgo/telemetry@1.4.1

## 2.0.0

### Highlights

- **First release.** Stripe payment provider for Medusa v2, built on Medusa's own `@medusajs/payment-stripe` 2.21.2 and reworked to the Gorgo integration standard. The derived code and its MIT notice are listed in [THIRD_PARTY_NOTICES.md](https://github.com/gorgojs/medusa-integrations/blob/main/packages/providers/payment-stripe/THIRD_PARTY_NOTICES.md).
- **Configured in the Admin.** Keys and payment settings live under **Settings → Integrations**, powered by the [Integration Module](https://docs.gorgojs.com/medusa-modules/integration). Secrets are encrypted at rest, test or live mode follows the key prefix, and the connection test checks that Stripe has a webhook endpoint for Medusa with every event the provider needs.
- **Replaces the built-in provider in place.** The plugin registers under the same provider id and webhook URL as `@medusajs/payment-stripe`, so switching takes no data migration. Payments the built-in provider created are captured, refunded and canceled as before.
- **Express checkout.** Apple Pay, Google Pay and Link buttons for the storefront. The buyer pays without filling in the checkout form, the address comes from their wallet, and the shipping cost updates for it.
- **Exact amounts.** ISK and UGX are charged in full, and three-decimal currencies such as KWD round to the nearest valid amount instead of up.
- **The store decides, not the storefront.** The capture method, the amount and the delivery address come from Medusa and the merchant's settings. Any other session data from the storefront stays out of the PaymentIntent.
- **No phantom refunds.** A refund Stripe rejects because the charge is already refunded fails in Medusa instead of being recorded. A captured payment is refunded, never canceled.
- **Tested and logged.** More than 150 unit and integration tests, and a debug log around every call to Stripe.
