<p align="center">
  <a href="https://docs.gorgojs.com/medusa-plugins/yookassa">
    <img alt="Medusa-YooKassa logo" src="https://raw.githubusercontent.com/gorgojs/medusa-plugins/refs/heads/main/assets/yookassa-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
YooKassa Payments for Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/medusa-plugins/yookassa">Documentation</a>
  <br/>
  A Medusa plugin that provides YooKassa payments. Production-ready.
  <br/>
  <a href="https://github.com/gorgojs/medusa-plugins/blob/HEAD/packages/medusa-payment-yookassa/README.ru.md">Читать README на русском ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-plugins/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-plugins/main/.badges/medusa-payment-yookassa.json&logo=checkmarx" alt="Tested with latest Medusa" />
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
- **Full Integration with YooKassa:** Connect your store to YooKassa for secure and reliable payments.
- **Receipt Generation:** Online receipts compliant with Federal Law No. 54 (FFD 1.05 and 1.2).
- **One-Step & Two-Step Payments:** Autocapture or authorization/hold payment flows.
- **Refunds & Cancellations:** Full refund and order cancellation support.
- **Webhook Notifications:** Real-time payment status updates with signature verification.
- **Detailed Logging:** Request and response logs for debugging and support in development mode.
- **Full Test Coverage:** Comprehensive unit and integration tests covering core flows and edge cases.
- **Storefront Example:** A complete <a href="https://github.com/gorgojs/medusa-plugins/tree/main/examples/payment-yookassa/medusa-storefront" target="_blank">Next.js storefront</a> ready to use as a reference.
- **`Integration Module`:** Configure this plugin directly in the Medusa Admin application — no editing configuration files or redeploying the store.

> **Integration Module:** This plugin supports the Integration module, which lets store administrators configure it directly in the Medusa Admin application instead of editing configuration files and redeploying the store. Sensitive values are encrypted, and settings are validated before they take effect.

## What is YooKassa

YooKassa is an internet acquiring service by Yandex. It lets online stores accept card payments, SBP (Faster Payments System), SberPay, Mir Pay, YooMoney, and more. Learn more at the <a href="https://yookassa.ru/en/" target="_blank">YooKassa website</a>.

## 💬  Support & Community

Got questions or ideas about the plugin? Join the Telegram support chat — [@gorgojs_chat](https://t.me/gorgojs_chat)

Connect with other Medusa developers on Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Requirements

- Medusa v2.17.2 or later
- Node.js v20 or later
- A YooKassa account – [sign in or create one](https://yookassa.ru/joinups/?source=ks)
- Integration Module v0.1.0 or later

## Installation

```bash
yarn add @gorgo/medusa-integration
yarn add @gorgo/medusa-payment-yookassa
# or
npm install @gorgo/medusa-integration
npm install @gorgo/medusa-payment-yookassa
```

## Documentation

The complete installation, configuration, and usage guide for this plugin is available on the [Gorgo documentation website](https://docs.gorgojs.com/medusa-plugins/yookassa).

## License

Licensed under the [MIT License](LICENSE).
