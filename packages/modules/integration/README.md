<p align="center">
  <a href="https://docs.gorgojs.com/medusa-modules/integration">
    <img alt="Integration Module logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/integration-medusa-logo.svg" width="270">
  </a>
</p>

<h1 align="center">
Integration Module for Medusa
</h1>

<p align="center">
  <a href="https://docs.gorgojs.com/medusa-modules/integration">Documentation</a>
  <br/>
  A Medusa module that lets any plugin or provider declare its options and store admins manage them in the Admin, with no <code>medusa-config</code> edits and no redeploys.
  <br/>
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/packages/modules/integration/README-ru.md">Читать README на русском ↗</a>
</p>

<br/>

<p align="center">
  <a href="https://medusajs.com">
    <img src="https://img.shields.io/badge/Medusa-^2.21.0-blue?logo=medusa" alt="Medusa" />
  </a>
  <a href="https://github.com/gorgojs/medusa-integrations/actions/workflows/update-medusa-version.yml">
    <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/gorgojs/medusa-integrations/main/.badges/medusa-integration.json&logo=checkmarx" alt="Medusa" />
  </a>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-integration">
    <img src="https://img.shields.io/npm/v/@gorgo/medusa-integration.svg?logo=npm&label=npm" alt="npm version" />
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
  <a href="https://static.gorgojs.com/videos/integration/demo/integration-demo-en.d5c59eb2.mp4">
    <img src="https://static.gorgojs.com/videos/integration/demo/integration-demo-en-poster-play.794aa69b.webp" alt="Watch the Integration Module demo video" width="100%" style="border-radius: 8px; max-width: 720px;">
  </a>
</p>

<p align="center">
  <a href="https://static.gorgojs.com/videos/integration/demo/integration-demo-en.d5c59eb2.mp4">▶ Watch the demo video</a>
</p>

## What Is the Integration Module

The Integration Module lets any plugin declare its options, and store admins configure them as **integrations** right in the Admin, with no `medusa-config` edits and no redeploys. The module takes care of the UI, storage, encryption, and validation.

The Integration Module is useful for any Medusa developer building plugins, providers, or custom modules that need configurable settings, such as API keys, credentials, modes, or webhooks, but who'd rather not hand-build settings UI pages, a data layer, and validation for each one.

## Features

- **Settings management in Admin:** Set in the **Settings → Integrations** section, no `medusa-config`/env edits and no redeploys.
- **Any plugin, provider, or module:** Works across payment, fulfillment, ERP, notification, content, and other extensions.
- **Declarative descriptor (`defineIntegration`):** A single description of the options, settings sections, validation, and connection test.
- **Flexible typing and validation:** Typed fields (`string`, `url`, `email`, `uuid`, `number`, `boolean`, `enum`, `json`) with per-option and cross-section rules, conditional visibility, and read-only fields. At runtime, the plugin gets a typed, decrypted object. Incomplete or disabled settings never resolve, so the plugin never gets an unfilled draft.
- **Encrypted secrets:** Fields marked `secret` are encrypted (AES-256-GCM) and never reach the browser.
- **Multiple instances:** The same provider can be configured more than once. For example, for several accounts in the same third-party service.
- **Connection test:** Verify credentials against the third-party service right from the Admin.
- **Change history:** The module records who changed which fields of an integration's settings and when. You can search and filter the history in the Admin, and secret values never reach it.
- **Extensible UI:** Sections can be reordered ([LayoutComposer](https://docs.medusajs.com/resources/admin-components/components/layout-composer)). If the generated sections aren't enough, you can implement any UI for your options using custom widgets.
- **Integration catalog:** The Admin shows the integrations from the Gorgo catalog. To add yours to it, make a [Pull Request](https://github.com/gorgojs/medusa-integrations#contribution).

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
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/tkassa.svg" width="50" hspace="5" align="left" alt="T-Kassa logo"/>
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
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-stripe">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/stripe.svg" width="50" hspace="5" align="left" alt="Stripe logo"/>
  </a>
  <b>Stripe</b><br/>
  Payment · <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-stripe">@gorgo/medusa-payment-stripe</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-paypal">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/paypal.svg" width="50" hspace="5" align="left" alt="PayPal logo"/>
  </a>
  <b>PayPal</b><br/>
  Payment · <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-paypal">@gorgo/medusa-payment-paypal</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-authorizenet">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/authorizenet.svg" width="50" hspace="5" align="left" alt="Authorize.net logo"/>
  </a>
  <b>Authorize.net</b><br/>
  Payment · <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-authorizenet">@gorgo/medusa-payment-authorizenet</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-mollie">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/mollie.svg" width="50" hspace="5" align="left" alt="Mollie logo"/>
  </a>
  <b>Mollie</b><br/>
  Payment · <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-mollie">@gorgo/medusa-payment-mollie</a>
</p>

<p>
  <a href="https://docs.gorgojs.com/medusa-integrations/1c-enterprise">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/1c.svg" width="50" hspace="5" align="left" alt="1C logo"/>
  </a>
  <b>1C:Enterprise</b><br/>
  ERP · <a href="https://docs.gorgojs.com/medusa-integrations/1c-enterprise">@gorgo-store/medusa-erp-1c</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@gorgo/medusa-1c">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/catalog/icons/1c.svg" width="50" hspace="5" align="left" alt="1C logo"/>
  </a>
  <b>1C:Enterprise Catalog</b><br/>
  ERP · <a href="https://www.npmjs.com/package/@gorgo/medusa-1c">@gorgo/medusa-1c</a>
</p>

Any plugin can use the Integration Module, see the [documentation](https://docs.gorgojs.com/medusa-modules/integration).

## 💬  Support & Community

Got questions or ideas? Join the Telegram support chat [@gorgojs_chat](https://t.me/gorgojs_chat)

Connect with other Medusa developers on Telegram [@medusajs_chat](https://t.me/medusajs_chat)

The [Maintenance](https://docs.gorgojs.com/resources/maintenance) page explains how we test, update and fix the module.

## Requirements

- Medusa v2.21.0 or later
- Node.js v22.23.4 or later (22.x), v24.22.1 or later (24.x), or v26.12.1 or later

## Installation

```bash
yarn add @gorgo/medusa-integration
# or
npm install @gorgo/medusa-integration
```

## Configuration

Register the module in `medusa-config.ts` together with the providers of the plugins you install, for example T-Kassa:

```ts
module.exports = defineConfig({
  plugins: [
    {
      resolve: "@gorgo/medusa-integration",
      options: {
        encryptionKey: process.env.INTEGRATION_ENCRYPTION_KEY,
        providers: [
          {
            resolve: "@gorgo/medusa-payment-tkassa/providers/integration-tkassa",
            id: "tkassa-1",
            options: {},
          },
        ],
      },
    },
  ],
})
```

The module keeps integrations and their change history in its own tables. Run the migrations after you install or update it:

```bash
yarn medusa db:migrate
# or
npx medusa db:migrate
```

Once the migrations run, restart the server. Each registered integration appears in Medusa Admin under **Settings → Integrations**.

## Environment Variables

- **`INTEGRATION_ENCRYPTION_KEY`** – the passphrase you pass as the `encryptionKey` option. The module derives the key that encrypts options marked `secret: true` from it. Set it to a long random string, for example the output of `openssl rand -hex 32`. A provider with a secret option doesn't work without it.
- **`GORGO_LICENSE`** – the project key from the Gorgo dashboard. Only paid Gorgo plugins need it. The module checks their licenses in the background and never blocks server startup. See [Install a Paid Plugin](https://docs.gorgojs.com/licensing/install).

## Documentation

The complete installation, configuration, and usage guide is available on the [Gorgo documentation website](https://docs.gorgojs.com/medusa-modules/integration).

## License

Licensed under the [MIT License](LICENSE).
