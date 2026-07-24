<p align="center">
  <a href="https://docs.gorgojs.com/integrations/t-kassa">
    <img alt="Medusa-T-Kassa logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/tkassa-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
T-Kassa Payments by T-Bank for Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/integrations/t-kassa">Documentation</a>
  <br/>
  A Medusa plugin that provides T-Kassa payments by T-Bank. Production-ready.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/providers/payment-tkassa/README.ru.md">Читать README на русском ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-payment-tkassa.json&logo=checkmarx" alt="Medusa" />
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
- **Full Integration with T-Kassa:** Connect your store to T-Kassa for secure and reliable payments.
- **Receipt Generation:** Online receipts compliant with Federal Law No. 54 (FFD 1.05 and 1.2).
- **One-Step & Two-Step Payments:** Autocapture or authorization/hold payment flows.
- **Refunds & Cancellations:** Full refund and order cancellation support.
- **Webhook Notifications:** Real-time payment status updates with signature verification.
- **Detailed Logging:** Request and response logs for debugging and support in development mode.
- **Full Test Coverage:** Comprehensive unit and integration tests covering core flows and edge cases.
- **Storefront Example:** A complete <a href="https://github.com/gorgojs/medusa-integrations/tree/main/examples/payment-tkassa/medusa-storefront" target="_blank">Next.js storefront</a> ready to use as a reference.
- **`Integration Module`:** Configure this plugin directly in the Medusa Admin application — no editing configuration files or redeploying the store.

> **Integration Module:** the Integration module, which lets store administrators configure it directly in the Medusa Admin application instead of editing configuration files and redeploying the store. Sensitive values are encrypted, and settings are validated before they take effect.

## What is T-Kassa

T-Kassa is an internet acquiring service by T-Bank (formerly Tinkoff Bank), one of Russia's largest digital banks. It lets online stores accept card payments, SBP (Faster Payments System), T-Pay, SberPay, Alfa Pay, Mir Pay, and more. Learn more at the <a href="https://www.tbank.ru/business/online-payments/internet-acquiring/" target="_blank">T-Bank website</a>.

## Who uses this plugin

<p>
  <a href="https://solidno.shop/">
    <img src="https://static.gorgojs.com/www/medusa-cases/solidno/solidno-logo.svg" width="50" hspace="5" align="left" alt="solidno.shop logo"/>
  </a>
  <b>Solidno</b><br/>
  <a href="https://solidno.shop/">solidno.shop</a> · Men's clothing brand
</p>

**Want to add your project to this list?** Make a [Pull Request](https://github.com/gorgojs/medusa-integrations#contribution) or write to [support chat](https://t.me/gorgojs_bot) on Telegram.

## 💬  Support & Community

Got questions or ideas about the plugin? Join the Telegram support chat — [@gorgojs_chat](https://t.me/gorgojs_chat)

Connect with other Medusa developers on Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Requirements

- Medusa v2.17.2 or later
- Node.js v20 or later
- A T-Business account with T-Kassa internet acquiring – [sign in or create one](https://www.tbank.ru/kassa/?utm_source=partners_sme&utm_medium=prt.utl&utm_campaign=business.int_acquiring.7-3S975SBSY&partnerId=7-3S975SBSY&agentId=5-B6HGU9OD&agentSsoId=1316b7dd-3a90-4167-9d35-37910431a19c)
- Integration Module v0.1.0 or later

## Installation

```bash
yarn add @gorgo/medusa-integration
yarn add @gorgo/medusa-payment-tkassa
# or
npm install @gorgo/medusa-integration
npm install @gorgo/medusa-payment-tkassa
```

## Documentation

The complete installation, configuration, and usage guide for this plugin is available on the [Gorgo documentation website](https://docs.gorgojs.com/integrations/t-kassa).

## License

Licensed under the [MIT License](LICENSE).
