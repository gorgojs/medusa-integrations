# @gorgo/license

The license check client for paid Gorgo plugins. It reads your license key, asks the Gorgo server whether each paid plugin you installed is covered, and keeps the verdict for the Medusa Admin.

## Installation

You don't need to install this package for a plugin that ships an integration descriptor. [`@gorgo/medusa-integration`](https://www.npmjs.com/package/@gorgo/medusa-integration) depends on it and registers those plugins for you.

Add it as a direct dependency only when you write a provider that has no integration descriptor.

```bash
yarn add @gorgo/license
```

## Usage in a Provider Without a Descriptor

Call `configureLicense` and `registerLicensedPackage` once from a provider loader or from `validateOptions`. Calling them again is safe, because the library skips a package it already knows and keeps the first license key and the first non-empty `backendUrl`.

```ts
import { configureLicense, registerLicensedPackage } from "@gorgo/license"
import type { LicenseChangeListener } from "@gorgo/license"

const onChange: LicenseChangeListener = (packageName, next) => {
  // react to the verdict, for example by tracking it
}

export function registerLicense(options: { license?: string }, backendUrl?: string) {
  configureLicense({ license: options.license, backendUrl, onChange })
  registerLicensedPackage({ packageDir: __dirname })
}
```

Keep `onChange` as one stable reference defined once at module level. The library stores listeners in a `Set`, so an arrow function created on every call adds a duplicate and each change fires twice.

## When the Check Fails

Your plugin keeps working whatever the server answers. The verdict only changes what you see in the Admin and never stops the plugin.

## What the Check Sends

The check runs only when a paid Gorgo plugin is installed. The [usage data page](https://docs.gorgojs.com/tools/usage-data) lists what it sends to the server.

## License

MIT
