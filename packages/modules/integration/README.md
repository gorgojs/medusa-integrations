<p align="center">
  <a href="https://docs.gorgojs.com/integrations/integration">
    <img alt="Integration Module logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/integration-medusa-logo.svg" width="100">
  </a>
</p>

<h1 align="center">
Integration Module for Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/integrations/integration">Documentation</a>
  <br/>
  A Medusa module that lets any plugin or provider declare its options and store admins manage them in the Admin – no <code>medusa-config</code> edits, no redeploys.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/modules/integration/README-ru.md">Читать README на русском ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-integration.json&logo=checkmarx" alt="Medusa" />
  </a>
</p>

<p align="center">
  <a href="https://t.me/gorgojs_chat">
    <img src="https://img.shields.io/badge/Telegram-Support_Chat-0088cc?logo=telegram&style=social" alt="Support Chat on Telegram" />
  </a>
</p>

<p align="center">
  <a href="https://t.me/medusajs_chat">
    <img src="https://img.shields.io/badge/Telegram-Medusa.js_Dev_Community_Chat-0088cc?logo=telegram&style=social" alt="Medusa.js Chat on Telegram" />
  </a>
</p>

<p align="center">
  <a href="https://static.gorgojs.com/videos/integration-module/integration-module.mp4">
    <img src="https://static.gorgojs.com/videos/integration-module/integration-module-preview-1776169330.webp" alt="Watch the Integration Module demo video" width="100%" style="border-radius: 8px; max-width: 720px;">
  </a>
</p>

## What is the Integration Module?

The Integration Module lets any plugin declare its options, and store admins configure them as **integrations** right in the Admin – no `medusa-config` edits, no redeploys. It generates the admin CRUD API and validation, so there are no data models, routes, or forms to write.

The Integration Module is useful for any Medusa developer building plugins, providers, or custom modules that need configurable settings, such as API keys, credentials, modes, or webhooks, but who'd rather not hand-build settings UI pages, a data layer, and validation for each one.

## Features

- **Settings management in Admin:** Set in the **Settings → Integrations** section, no `medusa-config`/env edits and no redeploys.
- **Any plugin, provider, or module:** Works across payment, fulfillment, ERP, notification, content, and other extensions.
- **Declarative descriptor (`defineIntegration`):** A single description of the options, settings sections, validation, and connection test.
- **Flexible typing and validation:** Typed fields (`string`, `url`, `email`, `uuid`, `number`, `boolean`, `enum`, `json`) with per-option and cross-section rules, conditional visibility, and read-only fields. At runtime, the plugin gets a typed, decrypted object: incomplete or disabled settings never resolve, so an unfilled draft is never returned.
- **Encrypted secrets:** Fields marked `secret` are encrypted (AES-256-GCM) and never reach the browser.
- **Multiple instances:** The same provider can be configured more than once. For example, for several accounts in the same third-party service.
- **Connection test:** Verify credentials against the third-party service right from the Admin.
- **Extensible UI:** Sections can be reordered (LayoutComposer). If the generated sections aren't enough, you can implement any UI for your options using custom widgets.
- **Integration catalog:** Available integrations are shown in the Admin, and any plugin appears there on equal footing with the built-in ones.

## Available Integrations

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-fulfillment-apiship">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/apiship.svg" width="50" hspace="5" align="left" alt="ApiShip logo"/>
  </a>
  <b>ApiShip</b><br/>
  Fulfillment · <a href="https://www.npmjs.com/package/@gorgo/medusa-fulfillment-apiship">@gorgo/medusa-fulfillment-apiship</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-tkassa">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/tkassa.png" width="50" hspace="5" align="left" alt="T-Kassa logo"/>
  </a>
  <b>T-Kassa by T-Bank</b><br/>
  Payment · <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-tkassa">@gorgo/medusa-payment-tkassa</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-yookassa">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/yookassa.svg" width="50" hspace="5" align="left" alt="YooKassa logo"/>
  </a>
  <b>YooKassa</b><br/>
  Payment · <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-yookassa">@gorgo/medusa-payment-yookassa</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-robokassa">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/robokassa.svg" width="50" hspace="5" align="left" alt="Robokassa logo"/>
  </a>
  <b>Robokassa</b><br/>
  Payment · <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-robokassa">@gorgo/medusa-payment-robokassa</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-1c">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/1c.svg" width="50" hspace="5" align="left" alt="1C logo"/>
  </a>
  <b>1C:Enterprise</b><br/>
  ERP · <a href="https://www.npmjs.com/package/@gorgo/medusa-1c">@gorgo/medusa-1c</a>
</p>

Any plugin can use the Integration Module, see the [documentation](https://docs.gorgojs.com/medusa-modules/integration).

## 💬  Support & Community

Got questions or ideas? Join the Telegram support chat — [@gorgojs_chat](https://t.me/gorgojs_chat)

Connect with other Medusa developers on Telegram — [@medusajs_chat](https://t.me/medusajs_chat)

## Requirements

- Medusa v2.17.2 or later
- Node.js v20 or later

## Installation

```bash
yarn add @gorgo/medusa-integration
# or
npm install @gorgo/medusa-integration
```

## Documentation

The complete installation, configuration, and usage guide is available on the [Gorgo documentation website](https://docs.gorgojs.com/medusa-modules/integration).

## License

Licensed under the [MIT License](LICENSE).
