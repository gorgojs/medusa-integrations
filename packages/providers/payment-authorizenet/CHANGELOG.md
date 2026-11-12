# @gorgo/medusa-payment-authorizenet

## 2.1.0

### Highlights

- **Upgrade to Integration Module 2.0.** This release requires [`@gorgo/medusa-integration`](https://www.npmjs.com/package/@gorgo/medusa-integration) 2.x, which needs Medusa v2.21.0 or later. Update both packages in one step, `yarn add @gorgo/medusa-integration@^2.0.0 @gorgo/medusa-payment-authorizenet@^2.1.0`, then run `npx medusa db:migrate`, which adds the change history and moves the settings of a registration without an `id` to the key of the instance `default`, and restart the server. The plugin's settings and the storefront integration keep working as they are. The [upgrade guide](https://docs.gorgojs.com/medusa-modules/integration/changelog) of the module lists what to check in your own code.
- **Change history of the settings.** The Integration Module records who changed which Authorize.net settings and when, with the value before and after. Secrets stay out of it. The **Change History** section of the integration's page shows the five latest changes, and the **Change History** page under **Settings → Integrations** lists every change, with a search and filters by integration, event, author, and date.
- **Search by name.** The **Integrations** page finds the integration by its name in the interface language, not only by its identifier.
- **Everything else in 2.0.** Metadata and a **JSON** section on the integration's page, secrets stored with a format version, startup warnings for provider authors, the renamed `AbstractIntegrationProviderService`, and the rewritten documentation are in the [module's changelog](https://docs.gorgojs.com/medusa-modules/integration/changelog).

### Features

- move the admin translations to the gorgo namespace by [@KaneFlak](https://github.com/KaneFlak) in [`8098d63`](https://github.com/gorgojs/medusa-integrations/commit/8098d63a6b4c516df11ecb7ff48fcb304bebae85)

### Dependencies

- Updated dependencies:
  - @gorgo/medusa-integration@2.0.0

## 2.0.3

### Documentation

- drop the migration section from the readme and the docs by [@gorgohead](https://github.com/gorgohead) in [`848780b`](https://github.com/gorgojs/medusa-integrations/commit/848780be9d0f7d2f25bfec2087f2a7f948c685a0)

## 2.0.2

### Documentation

- add the demo video to the docs and the readme by [@ttokyose](https://github.com/ttokyose) in [#527](https://github.com/gorgojs/medusa-integrations/pull/527) ([`3400aeb`](https://github.com/gorgojs/medusa-integrations/commit/3400aeb5a57f1954b9d31ba0c2acfb9e91f39b2e))

## 2.0.1

### Documentation

- add the configuration section and the maintenance link to the readme by [@gorgohead](https://github.com/gorgohead) in [`ed24927`](https://github.com/gorgojs/medusa-integrations/commit/ed24927c14b6a3bfbba771f92fe5ab4f59be9cdf)

## 2.0.0

### Highlights

- **First release.** Authorize.net payment provider for Medusa v2, written to the Gorgo integration standard. The buyer enters the card on the storefront and Accept.js sends it straight to Authorize.net, so card details never reach your server.
- **Configured in the Admin.** Credentials, the sandbox or production environment, the capture mode and Google Pay live under **Settings → Integrations**, powered by the [Integration Module](https://docs.gorgojs.com/medusa-modules/integration). Secrets are encrypted at rest. The connection test fails for an account in Test Mode, which keeps no transactions, and checks that an active webhook sends every event the provider needs.
- **One-step or two-step payments.** Capture right away, or authorize only and capture from Medusa later. A transaction already captured in the Merchant Interface is not captured again.
- **Express checkout.** A Google Pay button for the storefront. The buyer pays without filling in the checkout form, the address comes from their wallet, and the shipping cost updates for it. The plugin reads the Payment Gateway ID from your account, so you don't enter it.
- **Buyer in Authorize.net.** The buyer's email and addresses go into the transaction, read from the cart rather than from the storefront, and the transaction carries the Medusa session and cart IDs, so the merchant can find the order behind it.
- **Webhooks you can trust.** Every webhook is checked against its `X-ANET-Signature` with the Signature Key before it is processed. Approving a payment that the Fraud Detection Suite held completes the order waiting for it, and a capture made in the Merchant Interface reaches Medusa.
- **Safe money path.** Amounts follow each currency's precision, a captured payment is refunded and never canceled, and only reads are retried, so a transaction is never sent twice. Before the daily settlement, a full refund voids the payment and a partial one is refused with an explanation instead of an Authorize.net error.
- **Tested and logged.** More than 240 unit tests, and a debug log around every call to Authorize.net with the card token redacted.
