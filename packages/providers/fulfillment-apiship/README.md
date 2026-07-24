<p align="center">
  <a href="https://docs.gorgojs.com/integrations/apiship">
    <img alt="Medusa-ApiShip logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/apiship-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
ApiShip Integration for Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/integrations/apiship">Documentation</a>
  <br/>
  A Medusa plugin that integrates the ApiShip delivery aggregator platform, giving your store access to 40+ delivery carriers with minimal configuration. Production-ready.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/providers/fulfillment-apiship/README.ru.md">Читать README на русском ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-fulfillment-apiship.json&logo=checkmarx" alt="Medusa" />
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
  <a href="https://static.gorgojs.com/videos/apiship/apiship-1776095804.mp4">
    <img src="https://static.gorgojs.com/videos/apiship/apiship-play-button-1776166893.webp" alt="Watch the ApiShip plugin demo video" width="100%" style="border-radius: 8px; max-width: 720px;">
  </a>
</p>

## Plugin Features

- **Production-Ready:** Proven in live stores and ready for real-world deployment.
- **40+ Shipping Carriers:** Work with multiple carriers under direct contracts through a single integration.
- **Automatic Shipping Rate Calculation:** Considers package dimensions, weight, personal discounts, and carrier rates.
- **Pickup Point Delivery:** Select a pickup point from a list or on an interactive map.
- **One-Click Order Creation:** Create shipments in ApiShip directly from Medusa Admin, no manual data entry needed.
- **Shipment Documents Printing:** Labels, waybills, and other documents available in Medusa Admin.
- **Full Test Coverage:** Comprehensive unit and integration tests covering core flows and edge cases.
- **Storefront Example:** A ready-to-use [Next.js storefront example](https://github.com/gorgojs/medusa-integrations/tree/main/examples/fulfillment-apiship/medusa-storefront) you can use as a reference.
- **Test Mode:** Simulate calculations and orders without affecting real data.
- **Detailed Logging:** Request and response logs for debugging and support in development mode.
- **`Integration Module`:** Configure this plugin directly in the Medusa Admin application — no editing configuration files or redeploying the store.

> **Integration Module:** This plugin supports the Integration module, which lets store administrators configure it directly in the Medusa Admin application instead of editing configuration files and redeploying the store. Sensitive values are encrypted, and settings are validated before they take effect.

## What is ApiShip

<a href="https://apiship.com" target="_blank">ApiShip</a> is a Russian delivery aggregator platform that connects online stores to 40+ delivery services through a single API. Instead of integrating each carrier separately, ApiShip provides a unified interface for rate calculation, order creation, tracking, and document generation across all connected providers.

Popular delivery services available through ApiShip include CDEK, Yandex Delivery, Russian Post, Delovye Linii, PECOM, Boxberry, SberLogistics, DPD, and many more. You can browse the <a href="https://apiship.com/couriers" target="_blank">full list of delivery services</a> on the ApiShip website.

## 💬  Support & Community

Got questions or ideas about the plugin? Join the Telegram support chat — [@gorgojs_chat](https://t.me/gorgojs_chat)

Connect with other Medusa developers on Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Requirements

- Medusa v2.17.2 or later
- Node.js v20 or later
- An ApiShip account - [sign in or create one](https://a.apiship.ru)
- Integration Module v0.1.0 or later

## Installation

```bash
yarn add @gorgo/medusa-integration
yarn add @gorgo/medusa-fulfillment-apiship
# or
npm install @gorgo/medusa-integration
npm install @gorgo/medusa-fulfillment-apiship
```

## Documentation

The complete installation, configuration, and usage guide for this plugin is available on the [Gorgo documentation website](https://docs.gorgojs.com/integrations/apiship).

## License

Licensed under the [MIT License](LICENSE).
