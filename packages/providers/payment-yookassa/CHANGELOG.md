# @gorgo/medusa-payment-yookassa

## 2.0.1

### Refactoring

- add hints for options by [@KaneFlak](https://github.com/KaneFlak) in [`9c9e1ff`](https://github.com/gorgojs/medusa-integrations/commit/9c9e1ffaea590a650d9a663ba159e53fbfe80e45)

- change some number selects to enums by [@KaneFlak](https://github.com/KaneFlak) in [`ed5e09f`](https://github.com/gorgojs/medusa-integrations/commit/ed5e09fdbd7b906c4b7fc116e48773e9bb9c1010)

### Documentation

- add npm badges by [@ca11ba](https://github.com/ca11ba) in [#459](https://github.com/gorgojs/medusa-integrations/pull/459) ([`20dad3e`](https://github.com/gorgojs/medusa-integrations/commit/20dad3e91c2dd24ab4d1f17d33cc8b362a449340))

## 2.0.0

### Highlights

#### Migrated to the Integration Module

YooKassa is now configured in the Admin under **Settings → Integrations**, powered by the new [Integration Module](https://docs.gorgojs.com/medusa-modules/integration). Credentials are no longer read from `medusa-config` and env: a store admin fills in the settings form, secrets are encrypted at rest (AES-256-GCM), and the payment provider resolves the validated, decrypted config at runtime. No code edits and no redeploys to change settings. Read the [announcement](https://gorgojs.com/blog/announcing-medusa-integration-module).

### 🚧 Breaking Changes

- `@gorgo/medusa-integration` is now required. Install it next to the provider, register `@gorgo/medusa-payment-yookassa/providers/integration-yookassa` under it, and set `INTEGRATION_ENCRYPTION_KEY` in the env.
- Provider options in `medusa-config` (`shopId`, `secretKey`, `capture`, `paymentDescription`, `useReceipt`, `taxSystemCode`, and the rest) are no longer read. Re-enter them once in **Settings → Integrations**. The payment provider now takes a single option, `id`, pointing at the integration instance.
- See [Getting Started](https://docs.gorgojs.com/medusa-integrations/yookassa/getting-started) for the full v2 setup. The v1 guide stays at [Getting Started (legacy v1)](https://docs.gorgojs.com/medusa-integrations/yookassa/getting-started-legacy-v1).

## 1.0.5

### Chores

- upgrade Medusa versions and fix dependencies by [@gorgohead](https://github.com/gorgohead) in [`72fe8cf`](https://github.com/gorgojs/medusa-integrations/commit/72fe8cf32261cd3e44170bd64238587eebb43b2f)

## 1.0.4

### Documentation

- update readmes by [@ca11ba](https://github.com/ca11ba) in [#331](https://github.com/gorgojs/medusa-integrations/pull/331) ([`a7e9428`](https://github.com/gorgojs/medusa-integrations/commit/a7e942888f935e19cec4b3557da3a0c027e87cd3))

### Tests

- add unit and integration tests by [@ca11ba](https://github.com/ca11ba) in [#331](https://github.com/gorgojs/medusa-integrations/pull/331) ([`09c86da`](https://github.com/gorgojs/medusa-integrations/commit/09c86da76187d354f5c460bc0d86d89f9be667ef))

## 1.0.3

### Documentation

- minor improve readmes and docs by [@gorgohead](https://github.com/gorgohead) in [#326](https://github.com/gorgojs/medusa-integrations/pull/326) ([`a6dbd74`](https://github.com/gorgojs/medusa-integrations/commit/a6dbd74d0978e4a61a483a6f896efc07766735c4))

## 1.0.2

### Bug Fixes

- update docs and deps by [@ca11ba](https://github.com/ca11ba) in [#322](https://github.com/gorgojs/medusa-integrations/pull/322) ([`018a34c`](https://github.com/gorgojs/medusa-integrations/commit/018a34cecee5c19fd15cedac16f81241eed92231))

## 1.0.1

### Patch Changes

- Package moved to [@gorgo/medusa-payment-yookassa](https://www.npmjs.com/package/@gorgo/medusa-payment-yookassa) under the [gorgojs/medusa-plugins](https://github.com/gorgojs/medusa-integrations) monorepo
- Updated all releated documentation

## 0.0.0 – 1.0.0

Versions 0.0.0 – 1.0.0 were developed and published as [medusa-payment-yookassa](https://www.npmjs.com/package/medusa-payment-yookassa). The changelog for those versions was maintained [here](https://github.com/sergkoudi/medusa-payment-yookassa/blob/main/packages/medusa-payment-yookassa/CHANGELOG.md).
