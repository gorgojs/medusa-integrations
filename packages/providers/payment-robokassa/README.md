<p align="center">
  <a href="https://docs.gorgojs.com/integrations/robokassa">
    <img alt="Medusa-Robokassa logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/robokassa-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Robokassa Payments for Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/integrations/robokassa">Documentation</a>
  <br/>
  A Medusa plugin that provides Robokassa payments. Production-ready.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/providers/payment-robokassa/README.ru.md">Читать README на русском ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-payment-robokassa.json&logo=checkmarx" alt="Medusa" />
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
- **Full Integration with Robokassa:** Connect your store to Robokassa for secure and reliable payments.
- **Receipt Generation:** Online receipts compliant with Federal Law No. 54.
- **One-Step & Two-Step Payments:** Autocapture or authorization/hold payment flows.
- **Refunds & Cancellations:** Refund and order cancellation support.
- **Webhook Notifications:** Real-time payment status updates with signature verification.
- **Test Mode:** Simulate payments without real charges.
- **Detailed Logging:** Request and response logs for debugging and support in development mode.
- **Full Test Coverage:** Comprehensive unit and integration tests covering core flows and edge cases.
- **Storefront Example:** A complete <a href="https://github.com/gorgojs/medusa-integrations/tree/main/examples/payment-robokassa/medusa-storefront" target="_blank">Next.js storefront</a> ready to use as a reference.
- **`Integration Module`:** Configure this plugin directly in the Medusa Admin application — no editing configuration files or redeploying the store.

> **Integration Module:** This plugin supports the Integration module, which lets store administrators configure it directly in the Medusa Admin application instead of editing configuration files and redeploying the store. Sensitive values are encrypted, and settings are validated before they take effect.

## What is Robokassa

<a href="https://robokassa.com" target="_blank">Robokassa</a> is a Russian payment aggregator that supports bank cards, e-wallets, mobile payments, SBP, and other methods. It's widely used by small and mid-size online stores in Russia for its simple integration and broad payment method coverage.

## 💬  Support & Community

Got questions or ideas about the plugin? Join the Telegram support chat — [@gorgojs_chat](https://t.me/gorgojs_chat)

Connect with other Medusa developers on Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Requirements

- Medusa v2.17.2 or later
- Node.js v20 or later
- A Robokassa account – [sign in or create one](https://login.robokassa.ru/reg?promoCode=gorgo)
- Integration Module v0.1.0 or later

## Installation

```bash
yarn add @gorgo/medusa-integration
yarn add @gorgo/medusa-payment-robokassa
# or
npm install @gorgo/medusa-integration
npm install @gorgo/medusa-payment-robokassa
```

## Documentation

The complete installation, configuration, and usage guide for this plugin is available on the [Gorgo documentation website](https://docs.gorgojs.com/integrations/robokassa).

## License

Licensed under the [MIT License](LICENSE).
