# @gorgo/medusa-payment-paypal

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
