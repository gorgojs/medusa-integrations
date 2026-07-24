<h1 align="center">
Integration Module for Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/medusa-plugins/integration">Documentation</a>
  <br/>
  A Medusa module that lets plugins declare their settings and store admins configure them right in the Admin — no <code>medusa-config</code> edits, no redeploys, secrets encrypted at rest.
  <br/>
  <a href="https://github.com/gorgojs/medusa-plugins/blob/HEAD/packages/medusa-integration/README.ru.md">Читать README на русском ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.17.2-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Tested_with_Medusa-v2.17.2-green?logo=checkmarx" alt="Medusa" />
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

## Features

- **No-code configuration in the Admin.** Plugin credentials and settings are managed under Settings → Integrations — no `medusa-config`/env edits and no redeploys.
- **Encrypted secrets at rest.** Fields marked `secret` are encrypted (AES-256-GCM) and never reach the browser.
- **Declarative descriptor** (`defineIntegration`) for plugin authors: options, sections, validation, and a connection test in one place.
- **Rich option types & validation:** `string` / `url` / `email` / `uuid` / `number` / `boolean` / `enum` / `json`, per-option and cross-section rules, conditional visibility, read-only fields, i18n labels, and an icon.
- **Multiple instances** of the same provider (e.g. several accounts).
- **Connection test** from the Admin.
- **Typed runtime resolve:** consumers read a validated, decrypted config; incomplete or disabled configs never resolve, so drafts don't leak into runtime.
- **Custom admin widgets** per provider.
- **Anonymous telemetry.**

## What is the integration module?

Plugins need settings — API keys, modes, webhooks. Usually these live in `medusa-config`/env, which requires code access and a redeploy for every change, with secrets kept in plain text. This module moves settings into the **Admin and the database**: a store admin fills in a form, secrets are encrypted, and the consuming plugin reads the ready config at runtime. Plugin authors only **describe** the settings form — the module handles the UI, storage, encryption, and validation.

## Integrated plugins & providers

| Provider | Category | `resolve` |
|---|---|---|
| [T-Kassa](https://docs.gorgojs.com/medusa-plugins/t-kassa) | `payment` | `@gorgo/medusa-payment-tkassa-v2/providers/integration-tkassa` |

Any plugin can ship an integration provider — see the [documentation](https://docs.gorgojs.com/medusa-plugins/integration).

## 💬  Support & Community

Got questions or ideas about the module? Join the Telegram support chat — [@gorgojs_chat](https://t.me/gorgojs_chat)

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

The complete installation, configuration, and usage guide is available on the [Gorgo documentation website](https://docs.gorgojs.com/medusa-plugins/integration).

## License

Licensed under the [MIT License](LICENSE).
