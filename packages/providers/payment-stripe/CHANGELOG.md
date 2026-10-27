# @gorgo/medusa-payment-stripe

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
