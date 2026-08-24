# @gorgo/medusa-integration

## 0.2.0

### Features

- improve not found page by [@KaneFlak](https://github.com/KaneFlak) in [#466](https://github.com/gorgojs/medusa-integrations/pull/466) ([`35d3592`](https://github.com/gorgojs/medusa-integrations/commit/35d3592412dc5a4ea747e79b96a00091f3827087))

- add admin i18n translations for 31 locales by [@KaneFlak](https://github.com/KaneFlak) in [#466](https://github.com/gorgojs/medusa-integrations/pull/466) ([`8f37947`](https://github.com/gorgojs/medusa-integrations/commit/8f379478a4a39ab85093ad1b0095cc3f1a59680e))

- show markdown docsSnippet in install drawer and improve offline catalog by [@KaneFlak](https://github.com/KaneFlak) in [#466](https://github.com/gorgojs/medusa-integrations/pull/466) ([`8e002da`](https://github.com/gorgojs/medusa-integrations/commit/8e002da77c3013be686760d74e48d2c70d722fea))

- export upsert workflow and provider_id helpers by [@KaneFlak](https://github.com/KaneFlak) in [#466](https://github.com/gorgojs/medusa-integrations/pull/466) ([`361fb07`](https://github.com/gorgojs/medusa-integrations/commit/361fb07d3334e773cb64fce9e2bfe8b2c8f8c6dc))

- add number value support for enum by [@KaneFlak](https://github.com/KaneFlak) in [#466](https://github.com/gorgojs/medusa-integrations/pull/466) ([`c931067`](https://github.com/gorgojs/medusa-integrations/commit/c93106777ceada99de9a61f98268ec9b5d115b9e))

### Documentation

- add license and imrpove docs by [@gorgohead](https://github.com/gorgohead) in [#422](https://github.com/gorgojs/medusa-integrations/pull/422) ([`ea998d9`](https://github.com/gorgojs/medusa-integrations/commit/ea998d9c5551c9cecf93a447590551afc185edec))

- fix docs links in readme by [@gorgohead](https://github.com/gorgohead) in [#466](https://github.com/gorgojs/medusa-integrations/pull/466) ([`f0a4063`](https://github.com/gorgojs/medusa-integrations/commit/f0a406307b72275b4341351349b337990d0dded6))

## 0.1.5

- Add number value support for enum
- Improve docs

## 0.1.4

- Improve docs snippet and UI
- Update docs

## 0.1.3

- Update docs

## 0.1.2

- Export upsert workflow and provider_id helpers
- Update docs

## 0.1.1

- Bug fixes and improvements
- Update docs

## 0.1.0

### Highlights

- First release of the Integration Module for Medusa. Plugins declare their settings with a single `defineIntegration` descriptor, and store admins configure them right in the Admin under **Settings → Integrations** – no `medusa-config` edits, no redeploys.

### Features

- **No-code configuration in the Admin.** Manage plugin credentials and settings under Settings → Integrations.
- **Encrypted secrets at rest.** Fields marked `secret` are encrypted (AES-256-GCM) and never reach the browser.
- **Declarative descriptor** (`defineIntegration`) for plugin authors: options, sections, validation, and a connection test in one place.
- **Rich option types & validation:** `string` / `url` / `email` / `uuid` / `number` / `boolean` / `enum` / `json`, per-option and cross-section rules, conditional visibility, read-only fields, i18n labels, and an icon.
- **Multiple instances** of the same provider (e.g. several accounts).
- **Connection test** from the Admin.
- **Typed runtime resolve:** consumers read a validated, decrypted config; incomplete or disabled configs never resolve, so drafts don't leak into runtime.
- **Custom admin widgets** per provider.
- **Anonymous telemetry.**
