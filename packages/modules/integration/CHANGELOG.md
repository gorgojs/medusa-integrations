# @gorgo/medusa-integration

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
