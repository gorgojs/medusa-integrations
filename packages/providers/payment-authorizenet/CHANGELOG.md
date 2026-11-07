# @gorgo/medusa-payment-authorizenet

## 2.0.0

### Highlights

- **First release.** Authorize.net payment provider for Medusa v2, written to the Gorgo integration standard. The buyer enters the card on the storefront and Accept.js sends it straight to Authorize.net, so card details never reach your server.
- **Configured in the Admin.** Credentials, the sandbox or production environment, the capture mode and Google Pay live under **Settings → Integrations**, powered by the [Integration Module](https://docs.gorgojs.com/medusa-modules/integration). Secrets are encrypted at rest. The connection test fails for an account in Test Mode, which keeps no transactions, and checks that an active webhook sends every event the provider needs.
- **One-step or two-step payments.** Capture right away, or authorize only and capture from Medusa later. A transaction already captured in the Merchant Interface is not captured again.
- **Express checkout.** A Google Pay button for the storefront. The buyer pays without filling in the checkout form, the address comes from their wallet, and the shipping cost updates for it. The plugin reads the Payment Gateway ID from your account, so you don't enter it.
- **Buyer in Authorize.net.** The buyer's email and addresses go into the transaction, read from the cart rather than from the storefront, and the transaction carries the Medusa session and cart IDs, so the merchant can find the order behind it.
- **Webhooks you can trust.** Every webhook is checked against its `X-ANET-Signature` with the Signature Key before it is processed. Approving a payment that the Fraud Detection Suite held completes the order waiting for it, and a capture made in the Merchant Interface reaches Medusa.
- **Safe money path.** Amounts follow each currency's precision, a captured payment is refunded and never canceled, and only reads are retried, so a transaction is never sent twice. Before the daily settlement, a full refund voids the payment and a partial one is refused with an explanation instead of an Authorize.net error.
- **Drop-in replacement for `payment-authorizenet-medusa`.** The plugin keeps the provider ID `pp_authorizenet_authorizenet` and the webhook URL, so it captures, refunds and voids the payments the old plugin created without a data migration. See [Switch from the payment-authorizenet-medusa Plugin](https://docs.gorgojs.com/medusa-integrations/authorizenet/getting-started#switch-from-the-payment-authorizenet-medusa-plugin) for the steps.
- **Tested and logged.** More than 240 unit tests, and a debug log around every call to Authorize.net with the card token redacted.
