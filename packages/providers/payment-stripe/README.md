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
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-payment-stripe.json&logo=checkmarx" alt="Tested with latest Medusa" />
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

<p align="center">
  <a href="https://static.gorgojs.com/videos/payment-stripe/demo/payment-stripe-demo-en.30bdfab5.mp4">
    <img src="https://static.gorgojs.com/videos/payment-stripe/demo/payment-stripe-demo-en-poster-play.392fa704.webp" alt="Watch the Stripe plugin demo video" width="100%" style="border-radius: 8px; max-width: 720px;">
  </a>
</p>

<p align="center">
  <a href="https://static.gorgojs.com/videos/payment-stripe/demo/payment-stripe-demo-en.30bdfab5.mp4">▶ Watch the demo video</a>
</p>

## Plugin Features

- **Full Integration with Stripe:** Connect your store to Stripe for secure and reliable payments.
- **One-Step & Two-Step Payments:** Autocapture or authorization/hold payment flows.
- **Refunds & Cancellations:** Refund and order cancellation support.
- **Webhook Notifications:** Real-time payment status updates with signature verification.
- **Express Checkout:** Apple Pay, Google Pay and Link buttons for the storefront. The buyer pays without filling in the checkout form, the address comes from their wallet, and the shipping cost updates for it.
- **Detailed Logging:** Request and response logs for debugging and support in development mode.
- **Full Test Coverage:** Comprehensive unit and integration tests covering core flows and edge cases.
- **Storefront Example:** A complete <a href="https://github.com/gorgojs/medusa-integrations/tree/main/examples/payment-stripe/apps/storefront" target="_blank">Next.js storefront</a> ready to use as a reference.
- **[Integration module](https://gorgojs.com/medusa-integration-module) <img src="https://img.shields.io/badge/NEW-green" alt="New" /> :** Configure this plugin directly in the Medusa Admin application – no editing configuration files or redeploying the store.

> **Integration Module:** This plugin supports the Integration module, which lets store administrators configure it directly in the Medusa Admin application instead of editing configuration files and redeploying the store. Sensitive values are encrypted, and settings are validated before they take effect.

## What is Stripe

With Stripe, the buyer pays in Stripe's own payment form, so the store never handles card details. Stripe accepts payments in [more than 130 currencies](https://docs.stripe.com/currencies).

## 💬 Support & Community

Got questions or ideas about the plugin? Join the Telegram support chat, [@gorgojs_chat](https://t.me/gorgojs_chat).

Connect with other Medusa developers on Telegram in [@medusajs_chat](https://t.me/medusajs_chat).

## Requirements

- Medusa v2.17.2 or later
- Node.js v22.23.4, v24.22.1, v26.12.1 or later
- A Stripe account and its API keys from **Developers → API keys** in the [Stripe Dashboard](https://dashboard.stripe.com/)
- Integration Module

## Installation

```bash
yarn add @gorgo/medusa-integration @gorgo/medusa-payment-stripe
# or
npm install @gorgo/medusa-integration @gorgo/medusa-payment-stripe
```

## Replacing the Core Stripe Provider

The plugin takes over from Medusa's `@medusajs/payment-stripe` without a data migration. It keeps the provider ID `pp_stripe_stripe` and the webhook URL `/hooks/payment/stripe_stripe`, so payments created by the core provider are still captured and refunded. See [Switch from Medusa's Stripe Provider](https://docs.gorgojs.com/medusa-integrations/stripe/getting-started#switch-from-medusas-stripe-provider) for the steps.

## Documentation

The complete installation, configuration, and usage guide for this plugin is available on the [Gorgo documentation website](https://docs.gorgojs.com/medusa-integrations/stripe).

## License

Licensed under the [MIT License](LICENSE).
