<p align="center">
  <a href="https://docs.gorgojs.com/medusa-plugins/1c-enterprise">
    <img alt="Medusa-1C logo" src="https://raw.githubusercontent.com/gorgojs/medusa-plugins/refs/heads/main/assets/1c-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
  Medusa – 1C:Enterprise Integration
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/medusa-plugins/1c-enterprise">Documentation</a>
  <br/>
  Sync products and orders between Medusa and 1C:Enterprise.
  <br/>
  <a href="https://github.com/gorgojs/medusa-plugins/blob/HEAD/packages/medusa-1c/README.ru.md">Читать README на русском ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-plugins/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-plugins/main/.badges/medusa-1c.json&logo=checkmarx" alt="Medusa" />
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

## Status

> 🚧 Work in progress, see the [Roadmap](#roadmap).  

## 💬  Support & Community

Got questions or ideas about the plugin? Join the Telegram support chat — [@gorgojs_chat](https://t.me/gorgojs_chat)

Connect with other Medusa developers on Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Roadmap

- [x] Import products from 1C into Medusa (`import.xml`)
- [x] Import offers from 1C into Medusa (`offers.xml`)
- [ ] Sync inventory levels and prices between 1C and Medusa
- [ ] Import orders from 1C into Medusa (`orders.xml`)
- [ ] Export orders from Medusa to 1C
- [ ] Admin UI extension for synchronization status and controls
- [ ] Admin UI extension for journaling and audit logs
- [ ] Detailed documentation

> **Integration Module:** This plugin supports the Integration module, which lets store administrators configure it directly in the Medusa Admin application instead of editing configuration files and redeploying the store. Sensitive values are encrypted, and settings are validated before they take effect.

## Requirements

- Medusa server v2.17.2 or later
- Node.js v20 or later
- Integration Module v0.1.0 or later

## Installation

```bash
yarn add @gorgo/medusa-integration
yarn add @gorgo/medusa-1c
# or
npm install @gorgo/medusa-integration
npm install @gorgo/medusa-1c
```

## Documentation

The complete installation, configuration, and usage guide for this plugin is available on the [Gorgo documentation website](https://docs.gorgojs.com/medusa-plugins/1c-enterprise).

## License

Licensed under the [MIT License](LICENSE).
