# @gorgo/medusa-payment-paypal

## 2.1.0

### Highlights

- **Upgrade to Integration Module 2.0.** This release requires [`@gorgo/medusa-integration`](https://www.npmjs.com/package/@gorgo/medusa-integration) 2.x, which needs Medusa v2.21.0 or later. Update both packages in one step, `yarn add @gorgo/medusa-integration@^2.0.0 @gorgo/medusa-payment-paypal@^2.1.0`, then run `npx medusa db:migrate`, which adds the change history and moves the settings of a registration without an `id` to the key of the instance `default`, and restart the server. The plugin's settings and the storefront integration keep working as they are. The [upgrade guide](https://docs.gorgojs.com/medusa-modules/integration/changelog) of the module lists what to check in your own code.
- **Change history of the settings.** The Integration Module records who changed which PayPal settings and when, with the value before and after. Secrets stay out of it. The **Change History** section of the integration's page shows the five latest changes, and the **Change History** page under **Settings → Integrations** lists every change, with a search and filters by integration, event, author, and date.
- **Search by name.** The **Integrations** page finds the integration by its name in the interface language, not only by its identifier.
- **Everything else in 2.0.** Metadata and a **JSON** section on the integration's page, secrets stored with a format version, startup warnings for provider authors, the renamed `AbstractIntegrationProviderService`, and the rewritten documentation are in the [module's changelog](https://docs.gorgojs.com/medusa-modules/integration/changelog).

### Features

- move the admin translations to the gorgo namespace by [@KaneFlak](https://github.com/KaneFlak) in [`8098d63`](https://github.com/gorgojs/medusa-integrations/commit/8098d63a6b4c516df11ecb7ff48fcb304bebae85)

### Dependencies

- Updated dependencies:
  - @gorgo/medusa-integration@2.0.0

## 2.0.4

### Bug Fixes

- keep INVALID_DATA for a non-numeric amount on Medusa 2.22.6 by [@ca11ba](https://github.com/ca11ba) in [`b489c48`](https://github.com/gorgojs/medusa-integrations/commit/b489c487623ba1876665837ad591d79913b3298d)

## 2.0.3

### Documentation

- show the medusa-config registration in the readme by [@ttokyose](https://github.com/ttokyose) in [#521](https://github.com/gorgojs/medusa-integrations/pull/521) ([`598245d`](https://github.com/gorgojs/medusa-integrations/commit/598245ddd374177258ba9283baa0ba70222f9620))

## 2.0.2

### Documentation

- link the maintenance page from the readme by [@gorgohead](https://github.com/gorgohead) in [`2fb0875`](https://github.com/gorgojs/medusa-integrations/commit/2fb08758227db11067eca108c387e67863cb8f24)

## 2.0.1

### Documentation

- align the readme with the other payment plugins by [@gorgohead](https://github.com/gorgohead) in [#514](https://github.com/gorgojs/medusa-integrations/pull/514) ([`b63b61c`](https://github.com/gorgojs/medusa-integrations/commit/b63b61cf11652834a782fd86e7b0e7f5fcae3a98))

### Dependencies

- Updated dependencies:
  - @gorgo/telemetry@1.4.1

## 2.0.0

### Highlights

- **First release.** PayPal payment provider for Medusa v2 on the Orders v2 API, written to the Gorgo integration standard. Currency, status, decline and retry handling are derived from `@easypayment/medusa-payment-paypal` 1.3.2, as listed in [THIRD_PARTY_NOTICES.md](https://github.com/gorgojs/medusa-integrations/blob/main/packages/providers/payment-paypal/THIRD_PARTY_NOTICES.md).
- **Configured in the Admin.** Credentials, the sandbox or live environment and the checkout settings live under **Settings → Integrations**, powered by the [Integration Module](https://docs.gorgojs.com/medusa-modules/integration). Secrets are encrypted at rest, and the connection test checks that the webhook exists in the chosen environment and subscribes to every event the provider needs.
- **Express checkout.** A PayPal button for the storefront. The buyer pays without filling in the checkout form, the address comes from their PayPal account, and the shipping cost updates for it. When the cart changes, the provider updates the amount of the existing PayPal order instead of creating a new one.
- **Buyer and cart in PayPal.** The buyer's details and the cart items go into the PayPal order, so the merchant sees what was bought. Items can be turned off in the settings.
- **Webhooks you can trust.** Every webhook is verified with PayPal before it is processed, and both `PAYMENT.CAPTURE.DECLINED` and the older `PAYMENT.CAPTURE.DENIED` mark a payment as failed. The cart completes only on events after which the money is already with PayPal.
- **Safe money path.** Amounts follow each currency's precision, a captured payment is refunded and never canceled, and failed refunds surface as errors in Medusa.
- **Tested and logged.** More than 180 unit and integration tests, and a debug log around every call to PayPal.
