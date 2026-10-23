<p align="center">
  <a href="https://docs.gorgojs.com/medusa-integrations/stripe">
    <img alt="Medusa-Stripe logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/stripe-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Stripe Payments for Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/medusa-integrations/stripe">Documentation</a>
  <br/>
  A Medusa plugin that provides Stripe payments.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/providers/payment-stripe/README.ru.md">Читать README на русском ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-payment-stripe.json&logo=checkmarx" alt="Medusa" />
  </a>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-stripe">
    <img src="https://img.shields.io/npm/v/@gorgo/medusa-payment-stripe.svg?logo=npm&label=npm" alt="npm version" />
  </a>
</p>

<p align="center">
  <a href="https://t.me/gorgojs_chat">
    <img src="https://img.shields.io/badge/Telegram-Support_Chat-0088cc?logo=telegram&style=social" alt="Telegram Support Chat" />
  </a>
</p>

<p align="center">
  <a href="https://t.me/medusajs_chat">
    <img src="https://img.shields.io/badge/Telegram-Medusa.js_Dev_Community_Chat-0088cc?logo=telegram&style=social" alt="Medusa.js Chat on Telegram" />
  </a>
</p>

## Plugin Features

- **Production-Ready:** Proven in live stores and ready for real-world deployment.
- **One-Step & Two-Step Payments:** Autocapture or authorization/hold payment flows.
- **Refunds & Cancellations:** Refund and order cancellation support.
- **Webhook Notifications:** Real-time payment status updates with signature verification.
- **Express Checkout:** Apple Pay, Google Pay and Link in the express checkout row of the [Medusa DTC Starter by Gorgo](https://docs.gorgojs.com/tools/medusa-dtc-starter).
- **Detailed Logging:** Request and response logs for debugging and support in development mode.
- **Full Test Coverage:** Comprehensive unit and integration tests covering core flows and edge cases.
- **Storefront Example:** A complete <a href="https://github.com/gorgojs/medusa-integrations/tree/main/examples/payment-stripe/apps/storefront" target="_blank">Next.js storefront</a> ready to use as a reference.
- **[Integration module](https://gorgojs.com/medusa-integration-module) <img src="https://img.shields.io/badge/NEW-green" alt="New" /> :** Configure this plugin directly in the Medusa Admin application – no editing configuration files or redeploying the store.

## What is Stripe

With Stripe, the buyer pays in Stripe's own payment form, so the store never handles card details. Stripe accepts payments in [more than 130 currencies](https://docs.stripe.com/currencies).

## 💬 Support & Community

Got questions or ideas about the plugin? Join the Telegram support chat, [@gorgojs_chat](https://t.me/gorgojs_chat).

Connect with other Medusa developers on Telegram in [@medusajs_chat](https://t.me/medusajs_chat).

## Requirements

- Medusa v2.17.2 or later
- Node.js v20.19 or v22.12 and later
- A Stripe account and its API keys from **Developers → API keys** in the [Stripe Dashboard](https://dashboard.stripe.com/)
- Integration Module

## Installation

```bash
yarn add @gorgo/medusa-integration @gorgo/medusa-payment-stripe
# or
npm install @gorgo/medusa-integration @gorgo/medusa-payment-stripe
```

## Configuration

Register the plugin and both providers in `medusa-config.ts`:

```ts
const STRIPE_INTEGRATION_ID = "stripe-1"

module.exports = defineConfig({
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY,
        providers: [
          {
            resolve: "@gorgo/medusa-payment-stripe/providers/integration-stripe",
            id: STRIPE_INTEGRATION_ID,
            options: {},
          },
        ],
      },
    },
    {
      resolve: "@gorgo/medusa-payment-stripe",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@gorgo/medusa-payment-stripe/providers/payment-stripe",
            id: "stripe",
            options: { id: STRIPE_INTEGRATION_ID },
          },
        ],
      },
    },
  ],
})
```

Set `INTEGRATION_ENCRYPTION_KEY` in the backend's `.env`, restart the server, and enter the secret key, the publishable key and the webhook signing secret in **Settings → Integrations → Stripe**. The same page sets the capture mode, a payment method configuration, the payment description, the statement descriptor suffix and the receipt email. Point a Stripe webhook endpoint at `https://<your backend>/hooks/payment/stripe_stripe` and subscribe it to `payment_intent.succeeded` and `payment_intent.amount_capturable_updated`.

## Replacing the Core Stripe Provider

The plugin takes over from Medusa's `@medusajs/payment-stripe` without a data migration. The provider ID stays `pp_stripe_stripe` and the webhook URL stays `/hooks/payment/stripe_stripe`. Payments created by the core provider are still captured and refunded, and the webhook endpoint in the Stripe Dashboard keeps working.

To switch, do the following:

- Register the plugin and both providers as shown above in place of the core provider, and keep `id: "stripe"` on the payment provider.
- Move the core provider's `apiKey`, `webhookSecret` and `capture` options to **Settings → Integrations → Stripe**. The core provider only authorizes unless `capture` is `true`, while the plugin captures right away by default.
- Do not keep both packages registered under `id: "stripe"`, since both would claim `pp_stripe_stripe`.

## Usage Data

The plugin sends anonymous usage data when it starts. Set `GORGO_DISABLE_TELEMETRY=true` in the environment to turn it off. Details are on the [Usage Data](https://docs.gorgojs.com/tools/usage-data) page.

## Documentation

The complete installation, configuration, and usage guide for this plugin is available on the [Gorgo documentation website](https://docs.gorgojs.com/medusa-integrations/stripe).

## License

Licensed under the [MIT License](LICENSE).
