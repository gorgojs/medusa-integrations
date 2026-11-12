# @gorgo/medusa-payment-mollie

## 2.1.0

### Highlights

- **Upgrade to Integration Module 2.0.** This release requires [`@gorgo/medusa-integration`](https://www.npmjs.com/package/@gorgo/medusa-integration) 2.x, which needs Medusa v2.21.0 or later. Update both packages in one step, `yarn add @gorgo/medusa-integration@^2.0.0 @gorgo/medusa-payment-mollie@^2.1.0`, then run `npx medusa db:migrate`, which adds the change history and moves the settings of a registration without an `id` to the key of the instance `default`, and restart the server. The plugin's settings and the storefront integration keep working as they are. The [upgrade guide](https://docs.gorgojs.com/medusa-modules/integration/changelog) of the module lists what to check in your own code.
- **Change history of the settings.** The Integration Module records who changed which Mollie settings and when, with the value before and after. Secrets stay out of it. The **Change History** section of the integration's page shows the five latest changes, and the **Change History** page under **Settings → Integrations** lists every change, with a search and filters by integration, event, author, and date.
- **Search by name.** The **Integrations** page finds the integration by its name in the interface language, not only by its identifier.
- **Everything else in 2.0.** Metadata and a **JSON** section on the integration's page, secrets stored with a format version, startup warnings for provider authors, the renamed `AbstractIntegrationProviderService`, and the rewritten documentation are in the [module's changelog](https://docs.gorgojs.com/medusa-modules/integration/changelog).

### Features

- move the admin translations to the gorgo namespace by [@KaneFlak](https://github.com/KaneFlak) in [`8098d63`](https://github.com/gorgojs/medusa-integrations/commit/8098d63a6b4c516df11ecb7ff48fcb304bebae85)

### Dependencies

- Updated dependencies:
  - @gorgo/medusa-integration@2.0.0

## 2.0.0

### Highlights

- **First release.** Mollie payment provider for Medusa v2, written to the Gorgo integration standard on Mollie's official Node SDK, `mollie-api-typescript`. The buyer pays on Mollie's hosted payment page, so card details never reach your server.
- **Every payment method of your profile.** The plugin registers one provider, `pp_mollie_mollie`, and leaves the choice of method to Mollie's page. The buyer picks a card, iDEAL, Bancontact, PayPal or any other method enabled on your website profile, with no code per method. The page opens in the storefront's language when Mollie supports it.
- **Configured in the Admin.** The API key, the webhook URL, the capture mode and the payment description live under **Settings → Integrations**, powered by the [Integration Module](https://docs.gorgojs.com/medusa-modules/integration). The API key is encrypted at rest, and test or live mode follows its prefix. The connection test reads the website profile the key belongs to and shows its mode and name. It fails for a webhook URL that is not `https://` or does not point at the provider's `/hooks/payment/mollie_` route.
- **One-step or two-step payments.** Capture right away, or authorize only and capture from Medusa later, with the methods that can hold an amount, such as cards and Klarna. A capture takes the whole authorized amount, and a payment already paid is not captured again.
- **Webhooks you can trust.** A Mollie webhook carries only the payment ID and no signature, so the plugin reads every payment back from Mollie with your API key and acts only on what Mollie returns. A forged notification changes nothing. A paid payment places the order even if the buyer never returns from Mollie's page. You don't register the webhook in Mollie, because the plugin sends its URL with each payment.
- **No payment left behind.** Mollie does not cancel an open payment the buyer has not chosen a method for, so a replaced session can leave a payable page behind. If the buyer pays it anyway, no order can be placed for it, and the plugin refunds the payment in full and writes a warning to the log. A held payment of such a session is released instead.
- **Safe money path.** Amounts follow the precision Mollie takes for each currency, so JPY and ISK go without decimals and HUF with two. Every request that creates a payment, a capture or a refund carries an idempotency key, so a retried call never charges or refunds twice. A paid payment is refunded in one or several parts and never canceled, and a refund Mollie later reports as failed shows up as a warning in the log.
- **The store decides, not the storefront.** The amount, the capture mode, the buyer's addresses and the email come from Medusa and the merchant's settings. The storefront sends only the session ID, the return URL and the locale, and any other session data stays out of the Mollie payment. The payment carries the Medusa session and cart IDs, so the merchant can find the order behind it.
- **Tested and logged.** More than 200 unit and integration tests, and a debug log around every call to Mollie that leaves out the API key, the addresses and the email.
