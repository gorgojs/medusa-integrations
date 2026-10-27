<p align="center">
  <a href="https://docs.gorgojs.com/medusa-integrations/paypal">
    <img alt="Medusa-PayPal logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/paypal-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
PayPal Payments for Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/medusa-integrations/paypal">Documentation</a>
  <br/>
  A Medusa plugin that provides PayPal payments.
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-payment-paypal.json&logo=checkmarx" alt="Medusa" />
  </a>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-paypal">
    <img src="https://img.shields.io/npm/v/@gorgo/medusa-payment-paypal.svg?logo=npm&label=npm" alt="npm version" />
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

<p align="center">
  <a href="https://static.gorgojs.com/videos/payment-paypal/demo/payment-paypal-demo-en.18e12293.mp4">
    <img src="https://static.gorgojs.com/videos/payment-paypal/demo/payment-paypal-demo-en-poster-play.dbc68c06.webp" alt="Watch the PayPal plugin demo video" width="100%" style="border-radius: 8px; max-width: 720px;">
  </a>
</p>

<p align="center">
  <a href="https://static.gorgojs.com/videos/payment-paypal/demo/payment-paypal-demo-en.18e12293.mp4">▶ Watch the demo video</a>
</p>

## Plugin Features

- **One-Step & Two-Step Payments:** Autocapture or authorization/hold payment flows.
- **Refunds & Cancellations:** Full refund and order cancellation support.
- **Webhook Notifications:** Real-time payment status updates with signature verification.
- **Express Checkout:** A PayPal button for the storefront. The buyer pays without filling in the checkout form, the address comes from their PayPal account, and the shipping cost updates for it.
- **Detailed Logging:** Request and response logs for debugging and support in development mode.
- **Full Test Coverage:** Comprehensive unit and integration tests covering core flows and edge cases.
- **Storefront Example:** A complete <a href="https://github.com/gorgojs/medusa-integrations/tree/main/examples/payment-paypal/apps/storefront" target="_blank">Next.js storefront</a> ready to use as a reference.
- **[Integration module](https://gorgojs.com/medusa-integration-module) <img src="https://img.shields.io/badge/NEW-green" alt="New" /> :** Configure this plugin directly in the Medusa Admin application – no editing configuration files or redeploying the store.

## What is PayPal

With PayPal, the buyer pays with an account that holds their cards and bank accounts, so the store never handles card details. PayPal accepts payments in [25 currencies](https://developer.paypal.com/reference/currency-codes/).

## 💬 Support & Community

Got questions or ideas about the plugin? Join the Telegram support chat, [@gorgojs_chat](https://t.me/gorgojs_chat).

Connect with other Medusa developers on Telegram in [@medusajs_chat](https://t.me/medusajs_chat).

## Requirements

- Medusa v2.17.2 or later
- Node.js v22.23.4, v24.22.1, v26.12.1 or later
- A PayPal Business account and an app in the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
- Integration Module

## Installation

```bash
yarn add @gorgo/medusa-integration @gorgo/medusa-payment-paypal
# or
npm install @gorgo/medusa-integration @gorgo/medusa-payment-paypal
```

## Configuration

Register the plugin and both providers in `medusa-config.ts`:

```ts
const PAYPAL_INTEGRATION_ID = "paypal-1"

module.exports = defineConfig({
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY,
        providers: [
          {
            resolve: "@gorgo/medusa-payment-paypal/providers/integration-paypal",
            id: PAYPAL_INTEGRATION_ID,
            options: {},
          },
        ],
      },
    },
    {
      resolve: "@gorgo/medusa-payment-paypal",
      options: {},
    },
  ],
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@gorgo/medusa-payment-paypal/providers/payment-paypal",
            id: "paypal",
            options: { id: PAYPAL_INTEGRATION_ID },
          },
        ],
      },
    },
  ],
})
```

Set `INTEGRATION_ENCRYPTION_KEY` in the backend's `.env`, restart the server, and enter the client ID, secret and webhook ID in **Settings → Integrations → PayPal**. Point the PayPal webhook at `https://<your backend>/hooks/payment/paypal_paypal` and subscribe it to `PAYMENT.AUTHORIZATION.CREATED` and `PAYMENT.CAPTURE.COMPLETED`.

## Documentation

The complete installation, configuration, and usage guide for this plugin is available on the [Gorgo documentation website](https://docs.gorgojs.com/medusa-integrations/paypal).

## License

Licensed under the [MIT License](LICENSE).
