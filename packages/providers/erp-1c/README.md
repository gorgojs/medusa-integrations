<p align="center">
  <a href="https://docs.gorgojs.com/medusa-integrations/1c-enterprise">
    <img alt="Medusa-1C logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/1c-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
  Medusa – 1C:Enterprise Integration
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/medusa-integrations/1c-enterprise">Documentation</a>
  <br/>
  Sync products and orders between Medusa and 1C:Enterprise.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/providers/erp-1c/README.ru.md">Читать README на русском ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-erp-1c.json&logo=checkmarx" alt="Medusa" />
  </a>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-1c">
    <img src="https://img.shields.io/npm/v/@gorgo/medusa-1c.svg?logo=npm&label=npm" alt="npm version" />
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

> **The paid version is running a closed beta right now.** Participants get a price below the release one for the first year, help with the edge cases of their own 1C configuration and a chat with the development team. To take part in the testing, [apply for the beta](https://gorgojs.com/beta/medusa-1c).

## Free and Paid Version Features

| Capabilities | Free | Paid |
|---|---|---|
| CommerceML exchange | ✓ | ✓ |
| Products and categories from 1C into Medusa | ✓ | ✓ |
| Offers from 1C, variants with SKUs and prices | ✓ | ✓ |
| Plugin settings in the Medusa Admin through the [Integration module](https://gorgojs.com/medusa-integration-module) <img src="https://img.shields.io/badge/NEW-green" alt="New" /> | ✓ | ✓ |
| 1C price types as Medusa price lists | – | ✓ |
| Per-warehouse stock levels | – | ✓ |
| Two-way order exchange | – | ✓ |
| Tuned for large catalogs | – | ✓ |

> **[Integration module](https://gorgojs.com/medusa-integration-module)** lets any plugin declare its options as a schema, so a store administrator can configure them in the Medusa Admin, with no `medusa-config` edits and no redeploy. The module takes care of the UI, storage, encryption and validation.

## 💬  Support & Community

Got questions or ideas about the plugin? Join the Telegram support chat — [@gorgojs_chat](https://t.me/gorgojs_chat)

Connect with other Medusa developers on Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Requirements

- Medusa server v2.17.2 or later
- Node.js v20 or later
- Integration Module

## Installation

```bash
yarn add @gorgo/medusa-integration @gorgo/medusa-1c@beta
# or
npm install @gorgo/medusa-integration @gorgo/medusa-1c@beta
```

## Documentation

The complete installation, configuration, and usage guide for this plugin is available on the [Gorgo documentation website](https://docs.gorgojs.com/medusa-integrations/1c-enterprise).

## License

Licensed under the [MIT License](LICENSE).
