---
"@gorgo/medusa-integration": patch
---

Show the license verdict the online check reaches after boot

`@gorgo-store/license` 4 checks the license online in the background, so the verdict is not known
yet when the `checkLicenses` loader runs. The admin license status now reads the verifier's current
state on every request instead of a snapshot taken at boot, maps its `pending` and `unreachable`
states to "License unverified", and the loader passes each package's version so the platform can
apply the subscription cutoff.
