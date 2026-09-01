---
"@gorgo/medusa-integration": minor
---

Read the license flag from `package.json`, drop the per-package key map

A package declares itself licensed with `"gorgo": { "license": "required" }` in its own
`package.json`; the `requiresLicense` flag is gone from the descriptor, so the MIT core carries no
licensing vocabulary in its public types. `PackageMeta` gains a `license` field
(`"required" | "optional" | null`) — anything else, `true` included, leaves the package unlicensed,
so a typo can never gate a plugin.

The project has one key, so `options.licenses` (a map keyed by package name) collapses into a single
`options.license`, defaulting to `GORGO_LICENSE`.

`GET /admin/integrations/license-status` reports the per-package verdict
(`ok`/`grace`/`stale`/`failed`/`undetermined`) that the `checkLicenses` loader decided at boot, and
"Settings → Integrations" shows it as a banner plus a third status badge. It is read-only: the key
lives in the environment and there is no form to submit one.

BREAKING: `requiresLicense` on a descriptor and `options.licenses` are removed. A provider that used
either keeps working; it is checked when its package declares `gorgo.license`, and the key comes from
`options.license` or `GORGO_LICENSE`.
