# @gorgo/medusa-integration

## 0.2.0

### Features

- improve not found page by [@KaneFlak](https://github.com/KaneFlak) in [`1d4f61e`](https://github.com/gorgojs/medusa-integrations/commit/1d4f61e34a8c35b0b4e09c817f2d9b0515f315ef)

- add admin i18n translations for 31 locales by [@KaneFlak](https://github.com/KaneFlak) in [`850f904`](https://github.com/gorgojs/medusa-integrations/commit/850f904d365ba76ae027fc463458fff82b8eeeaf)

- show markdown docsSnippet in install drawer and improve offline catalog by [@KaneFlak](https://github.com/KaneFlak) in [#439](https://github.com/gorgojs/medusa-integrations/pull/439) ([`2cabc9b`](https://github.com/gorgojs/medusa-integrations/commit/2cabc9b1e42a7d2e92dbc1f90708986acebb6f2d))

- export upsert workflow and provider_id helpers by [@KaneFlak](https://github.com/KaneFlak) in [#422](https://github.com/gorgojs/medusa-integrations/pull/422) ([`f720768`](https://github.com/gorgojs/medusa-integrations/commit/f720768c9b490527c61ad9ab9a891a2d28630280))

- add number value support for enum by [@KaneFlak](https://github.com/KaneFlak) in [`6bf6a19`](https://github.com/gorgojs/medusa-integrations/commit/6bf6a1979fb973e87012857346ea95e967c8e005)

### Documentation

- add license and imrpove docs by [@gorgohead](https://github.com/gorgohead) in [#422](https://github.com/gorgojs/medusa-integrations/pull/422) ([`ea998d9`](https://github.com/gorgojs/medusa-integrations/commit/ea998d9c5551c9cecf93a447590551afc185edec))

- fix docs links in readme by [@gorgohead](https://github.com/gorgohead) in [`2bd8661`](https://github.com/gorgojs/medusa-integrations/commit/2bd8661f14ee927c13c3d5ff3118b422d03f2554)

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
