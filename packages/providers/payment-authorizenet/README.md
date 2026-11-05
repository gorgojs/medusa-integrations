<p align="center">
  <a href="https://docs.gorgojs.com/medusa-integrations/authorizenet">
    <img alt="Medusa-Authorize.net logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/authorizenet-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Authorize.net Payments for Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/medusa-integrations/authorizenet">Documentation</a>
  <br/>
  A Medusa plugin that provides Authorize.net payments.
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-payment-authorizenet.json&logo=checkmarx" alt="Tested with latest Medusa" />
  </a>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-authorizenet">
    <img src="https://img.shields.io/npm/v/@gorgo/medusa-payment-authorizenet.svg?logo=npm&label=npm" alt="npm version" />
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

- **Full Integration with Authorize.net:** Connect your store to the Authorize.net payment gateway for secure and reliable payments.
- **One-Step & Two-Step Payments:** Autocapture or authorization/hold payment flows.
- **Refunds & Cancellations:** Refund and order cancellation support.
- **Webhook Notifications:** Real-time payment status updates with signature verification.
- **Express Checkout:** A Google Pay button for the storefront. The buyer pays without filling in the checkout form, the address comes from their wallet, and the shipping cost updates for it.
- **Detailed Logging:** Request and response logs for debugging and support in development mode.
- **Full Test Coverage:** Comprehensive unit and integration tests covering core flows and edge cases.
- **Storefront Example:** A complete <a href="https://github.com/gorgojs/medusa-integrations/tree/main/examples/payment-authorizenet/apps/storefront" target="_blank">Next.js storefront</a> ready to use as a reference.
- **[Integration module](https://gorgojs.com/medusa-integration-module) <img src="https://img.shields.io/badge/NEW-green" alt="New" /> :** Configure this plugin directly in the Medusa Admin application – no editing configuration files or redeploying the store.

> **Integration Module:** This plugin supports the Integration module, which lets store administrators configure it directly in the Medusa Admin application instead of editing configuration files and redeploying the store. Sensitive values are encrypted, and settings are validated before they take effect.

## What is Authorize.net

With Authorize.net, the buyer enters the card in a form on your storefront, and Accept.js sends it straight to Authorize.net, so your server never handles card details. An Authorize.net account takes payments in one currency, set when the account is created.

## 💬 Support & Community

Got questions or ideas about the plugin? Join the Telegram support chat, [@gorgojs_chat](https://t.me/gorgojs_chat).

Connect with other Medusa developers on Telegram in [@medusajs_chat](https://t.me/medusajs_chat).

## Requirements

- Medusa v2.17.2 or later
- Node.js v22.23.4, v24.22.1, v26.12.1 or later
- An Authorize.net account and its keys from **Account → Settings → API Credentials & Keys** in the Merchant Interface
- Integration Module

## Installation

```bash
yarn add @gorgo/medusa-integration @gorgo/medusa-payment-authorizenet
# or
npm install @gorgo/medusa-integration @gorgo/medusa-payment-authorizenet
```

## Replacing the payment-authorizenet-medusa Plugin

The plugin takes over from `payment-authorizenet-medusa` without a data migration. It keeps the provider ID `pp_authorizenet_authorizenet` and the webhook URL `/hooks/payment/authorizenet_authorizenet`, so payments created by the old plugin are still captured, refunded and voided. See [Switch from the payment-authorizenet-medusa Plugin](https://docs.gorgojs.com/medusa-integrations/authorizenet/getting-started#switch-from-the-payment-authorizenet-medusa-plugin) for the steps.

## Documentation

The complete installation, configuration, and usage guide for this plugin is available on the [Gorgo documentation website](https://docs.gorgojs.com/medusa-integrations/authorizenet).

## License

Licensed under the [MIT License](LICENSE).
