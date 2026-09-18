# @gorgo/medusa-fulfillment-apiship

## 2.0.0

### Highlights

- **Migrated to the Integration Module.** ApiShip is now configured in the Admin under **Settings → Integrations**, powered by the new [`@gorgo/medusa-integration`](https://www.npmjs.com/package/@gorgo/medusa-integration) module. Credentials are no longer read from `medusa-config` and env — a store admin fills in the settings form, secrets are encrypted at rest (AES-256-GCM), and the provider resolves the validated, decrypted config at runtime. No code edits and no redeploys to change settings.

- **Shaped by feedback from stores running the plugin.** This release collects a long list of features and bug fixes that came from real ApiShip installations, across the Admin forms, tariff handling, the fulfillment flow and logging. Most of them are tracked in [#425](https://github.com/gorgojs/medusa-integrations/issues/425), the feedback a community developer sent after running the plugin with CDEK, Yandex Delivery and Russian Post.

### Features

- improve tarrifs combobox and forms by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`e31242c`](https://github.com/gorgojs/medusa-integrations/commit/e31242ce7f449161eeaaf3bc18df8fe4614b71a8))

- add switch-box to forms by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`ecdbffc`](https://github.com/gorgojs/medusa-integrations/commit/ecdbffc477d0a18e71291300a5c5acfc2ea25987))

- add retrieving documents in the background by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`19a0e97`](https://github.com/gorgojs/medusa-integrations/commit/19a0e97865489c0699481f55879c5792381dd696))

- enhance API call logging with request and response details by [@gorgohead](https://github.com/gorgohead) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`5ec2158`](https://github.com/gorgojs/medusa-integrations/commit/5ec215899188ea36f584ce096f0c7275f2643673))

- improve sync shipment documents by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`cb6212c`](https://github.com/gorgojs/medusa-integrations/commit/cb6212c298e376d59793245d34eac3849580a21c))

- add sender company setting by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`bafabd3`](https://github.com/gorgojs/medusa-integrations/commit/bafabd3ce7df9b3c4acfe1fec2f282c642b52ada))

- improve retry button by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`22eaba8`](https://github.com/gorgojs/medusa-integrations/commit/22eaba8cceac2ac9830e1a2a7b18899cd06edc3f))

### Bug Fixes

- improve translations by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`c235309`](https://github.com/gorgojs/medusa-integrations/commit/c235309f63240835bcece63ab8874ec00a4839a9))

- uppercase stock location country code in ApiShip requests by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`a041a61`](https://github.com/gorgojs/medusa-integrations/commit/a041a61321f1a5cdd082d7950378c2acdd652b06))

- fix tariffs table cell by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`093f235`](https://github.com/gorgojs/medusa-integrations/commit/093f2353ee54b6149bdf9cbc27f3149c89cefbd1))

- forbid multiple enabled connections for the same service and stock location by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`1b95d94`](https://github.com/gorgojs/medusa-integrations/commit/1b95d94602612f90d954eccc585c588fe5b17d57))

- add convenient way to set rate limits by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`1e1652c`](https://github.com/gorgojs/medusa-integrations/commit/1e1652c26eacb5e504ab0043f024ed809580a8f4))

- optimize long processing by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`a380b2e`](https://github.com/gorgojs/medusa-integrations/commit/a380b2e0ae599ea0d12a10fd64baee593c96614e))

- fix different services and handover methods require different points by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`1b0f2ea`](https://github.com/gorgojs/medusa-integrations/commit/1b0f2ea0fda457859fff767998c1d984595e6151))

- fix the required drop-off point by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`f142ea3`](https://github.com/gorgojs/medusa-integrations/commit/f142ea3db2a0b974a99791b1df6a02dbdaaceebe))

- fix the list of drop-off points stopped loading by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`48c4a56`](https://github.com/gorgojs/medusa-integrations/commit/48c4a5682343ab68d50b861a04f21a499b4e9238))

- add waitForLabel option to skip label polling during fulfillment creation by [@gorgohead](https://github.com/gorgohead) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`d920d02`](https://github.com/gorgojs/medusa-integrations/commit/d920d0217d1deb42258a67eb888158f90c57f1f5))

### Documentation

- update apiship docs to new major by [@gorgohead](https://github.com/gorgohead) in [`4363f68`](https://github.com/gorgojs/medusa-integrations/commit/4363f6875fbd015703ed8601247c44e57de692a0)

### Tests

- uppercase stock location country code in ApiShip requests by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`6dc748a`](https://github.com/gorgojs/medusa-integrations/commit/6dc748a06d50a9fd3f402c52d9eae6789687a38f))

- improve stock location test by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`d200ec6`](https://github.com/gorgojs/medusa-integrations/commit/d200ec6ba9eaff07daa7a6b2b2489d41430929d6))

- add tariffs tests by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`8d24f13`](https://github.com/gorgojs/medusa-integrations/commit/8d24f13ffd17ba6cb4726e359fdbb776b70f2152))

- add shipment documents test by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`b3c1db9`](https://github.com/gorgojs/medusa-integrations/commit/b3c1db9312c82d3bd2f85aa6902a415aa2ed6607))

- improve create fulfillment test by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`3a92c6b`](https://github.com/gorgojs/medusa-integrations/commit/3a92c6b35139c48ac77d47c03079a7274b6c2299))

- improve stock locations tests by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`dc49b3e`](https://github.com/gorgojs/medusa-integrations/commit/dc49b3e66d4b8b2abc7f16a92a848c91c1687c86))

- improve tests by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`bc22c9e`](https://github.com/gorgojs/medusa-integrations/commit/bc22c9e383cf8aa5ce894d2940f628c16bd3264d))

- improve shipment documents tests by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`529c6fe`](https://github.com/gorgojs/medusa-integrations/commit/529c6fe61b8d467450a51d1f866b9f459acebf80))

- add sender company tests by [@ca11ba](https://github.com/ca11ba) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`985a3aa`](https://github.com/gorgojs/medusa-integrations/commit/985a3aad140ee461af6e6b6cdfa10514f74a991c))

### Chores

- release major by [@gorgohead](https://github.com/gorgohead) in [#493](https://github.com/gorgojs/medusa-integrations/pull/493) ([`cac33f9`](https://github.com/gorgojs/medusa-integrations/commit/cac33f9e105be6e35ade296c35e3c9414217f4bc))

## 1.0.1

### Tests

- fix get-cheapest-tarrif by [@ca11ba](https://github.com/ca11ba) in [#353](https://github.com/gorgojs/medusa-integrations/pull/353) ([`62dc3dd`](https://github.com/gorgojs/medusa-integrations/commit/62dc3dd907a9720f232f8321971b98bf65caa47a))

## 1.0.0

### Highlights

- Stable release. The ApiShip integration is production-proven - running on multiple live stores for over 5 months. No breaking changes vs v0.5.13. by [@gorgohead](https://github.com/gorgohead) in [#349](https://github.com/gorgojs/medusa-integrations/pull/349) ([`ad61509`](https://github.com/gorgojs/medusa-integrations/commit/ad61509c65c9cbb87f83a23e83dd86fc49c81e2b))

### Documentation

- improve readmes by [@ca11ba](https://github.com/ca11ba) in [#346](https://github.com/gorgojs/medusa-integrations/pull/346) ([`3747b1a`](https://github.com/gorgojs/medusa-integrations/commit/3747b1a7a3f3ea399a88732c5def5e6ec6fbdcdc))

### Tests

- add tests for apiship by [@ca11ba](https://github.com/ca11ba) in [#346](https://github.com/gorgojs/medusa-integrations/pull/346) ([`2f56da4`](https://github.com/gorgojs/medusa-integrations/commit/2f56da4517c341c9da091d1dd558e3d1767bee5f))

## 0.5.13

### Chores

- upgrade Medusa versions and fix dependencies by [@gorgohead](https://github.com/gorgohead) in [`72fe8cf`](https://github.com/gorgojs/medusa-integrations/commit/72fe8cf32261cd3e44170bd64238587eebb43b2f)

## 0.5.12

### Documentation

- minor fix readme by [@gorgohead](https://github.com/gorgohead) in [#325](https://github.com/gorgojs/medusa-integrations/pull/325) ([`31712e3`](https://github.com/gorgojs/medusa-integrations/commit/31712e33031bf78c5de26e0fd9e953023cedeec5))

## 0.5.11

### Documentation

- minor improve readmes and docs by [@gorgohead](https://github.com/gorgohead) in [#326](https://github.com/gorgojs/medusa-integrations/pull/326) ([`a6dbd74`](https://github.com/gorgojs/medusa-integrations/commit/a6dbd74d0978e4a61a483a6f896efc07766735c4))

## 0.5.10

### Documentation

- change link in doc pages by [@ttokyose](https://github.com/ttokyose) in [#320](https://github.com/gorgojs/medusa-integrations/pull/320) ([`1ff8ae9`](https://github.com/gorgojs/medusa-integrations/commit/1ff8ae9e3f72a3002ca3cb122cce641f11f77edc))

## 0.5.9

### Documentation

- change chat link by [@gorgohead](https://github.com/gorgohead) in [`7908c47`](https://github.com/gorgojs/medusa-integrations/commit/7908c470f04d7e9b388ed134e4b6df90f42f6cae)

## 0.5.8

### Bug Fixes

- add badjes to main, fix readmes, change scripts by [@Ghost1863](https://github.com/Ghost1863) in [#308](https://github.com/gorgojs/medusa-integrations/pull/308) ([`356bca7`](https://github.com/gorgojs/medusa-integrations/commit/356bca788e7ca8a59f65c0bef0c31ac68ca4f3c3))

## 0.5.7

### Bug Fixes

- remove apiship model and options by [@ttokyose](https://github.com/ttokyose) in [#271](https://github.com/gorgojs/medusa-integrations/pull/271) ([`7bb54f7`](https://github.com/gorgojs/medusa-integrations/commit/7bb54f7e4c3ae629e2370fbe725aed7dc7939ee8))

## 0.5.6

### Documentation

- test on Medusa v2.15.3 and update readme by [@gorgo-app](https://github.com/apps/gorgo-app) in [#265](https://github.com/gorgojs/medusa-integrations/pull/265) ([`d2cd44a`](https://github.com/gorgojs/medusa-integrations/commit/d2cd44a3fbe4fa1db50b6c63a9bc4683a48de459))

## 0.5.5

### Bug Fixes

- make the connection name optional by [@ttokyose](https://github.com/ttokyose) in [#257](https://github.com/gorgojs/medusa-integrations/pull/257) ([`3e9c650`](https://github.com/gorgojs/medusa-integrations/commit/3e9c6503eeaf937835b6ca67e0d40a8c24af8f3d))

## 0.5.4

### Documentation

- add plugins logo by [@ttokyose](https://github.com/ttokyose) in [#253](https://github.com/gorgojs/medusa-integrations/pull/253) ([`98e79cd`](https://github.com/gorgojs/medusa-integrations/commit/98e79cd66117c0be832c4cafa265d2653d1754cc))

## 0.5.3

### Chores

- align telemetry by [@gorgohead](https://github.com/gorgohead) in [`6586436`](https://github.com/gorgojs/medusa-integrations/commit/65864366a1e75568cd70f4674e73789f30f527fa)

## 0.5.2

### Documentation

- test on Medusa v2.15.2 and update readme by [@gorgo-app](https://github.com/apps/gorgo-app) in [#248](https://github.com/gorgojs/medusa-integrations/pull/248) ([`44351ab`](https://github.com/gorgojs/medusa-integrations/commit/44351abcafb01ffa8f2c9e08fc98f3c359444b8d))

- test on Medusa v2.15.1 and update readme by [@gorgo-app](https://github.com/apps/gorgo-app) in [#244](https://github.com/gorgojs/medusa-integrations/pull/244) ([`eefd1db`](https://github.com/gorgojs/medusa-integrations/commit/eefd1dbb0762f0e6bb9b5916386a26ef8d3a266c))

## 0.5.1

### Documentation

- test on Medusa v2.14.2 and update readme by [@gorgo-app](https://github.com/apps/gorgo-app) in [#239](https://github.com/gorgojs/medusa-integrations/pull/239) ([`bcd8eaf`](https://github.com/gorgojs/medusa-integrations/commit/bcd8eafeed495dbb752840322fafe9be84a8fd57))

## 0.5.0

### Features

- improve naming and requests by [@gorgohead](https://github.com/gorgohead) in [#236](https://github.com/gorgojs/medusa-integrations/pull/236) ([`a58f4e5`](https://github.com/gorgojs/medusa-integrations/commit/a58f4e5b57fcc450558c622fe823065aaca1dead))

## 0.4.4

### Documentation

- test on Medusa v2.14.1 and update readme by [@gorgo-app](https://github.com/apps/gorgo-app) in [#230](https://github.com/gorgojs/medusa-integrations/pull/230) ([`433f939`](https://github.com/gorgojs/medusa-integrations/commit/433f9399809b19b43ac5386a41674f78e99db264))

## 0.4.3

### Documentation

- improve readme by [@gorgohead](https://github.com/gorgohead) in [#212](https://github.com/gorgojs/medusa-integrations/pull/212) ([`7232152`](https://github.com/gorgojs/medusa-integrations/commit/7232152af5fcdcf57bc6ca53ade54327e55ee605))

## 0.4.2

### Documentation

- improve readme by [@gorgohead](https://github.com/gorgohead) in [#196](https://github.com/gorgojs/medusa-integrations/pull/196) ([`0bd3966`](https://github.com/gorgojs/medusa-integrations/commit/0bd39665e47946f2d8c0968d27b8ff92064113d2))

## 0.4.1

### Patch Changes

- Update docs

## 0.4.0

### Features

- add apiship readme demo video ([#190](https://github.com/gorgojs/medusa-integrations/issues/190)) by [@gorgohead](https://github.com/gorgohead) in [#190](https://github.com/gorgojs/medusa-integrations/pull/190) ([`eab0baf`](https://github.com/gorgojs/medusa-integrations/commit/eab0baf75e03aedc86df178ee354403058a30547))

## 0.3.1

### Bug Fixes

- improve UI texts by [@gorgohead](https://github.com/gorgohead) in [`deef5f7`](https://github.com/gorgojs/medusa-integrations/commit/deef5f72f36a835bbf766dbf3b6b5dcece9db4a8)

## 0.3.0

### Features

- feat: manage all ApiShip settings in Medusa Admin by [@ttokyose](https://github.com/ttokyose) in [#182](https://github.com/gorgojs/medusa-integrations/pull/182) ([`8463123`](https://github.com/gorgojs/medusa-integrations/commit/84631238073bf5803cab1f7c29a1681c1ab496db))

## 0.2.4

### Patch Changes

- Test on Medusa 2.13.4

## 0.2.3

### Patch Changes

- Improve storefront integration

## 0.2.2

### Patch Changes

- Test on Medusa 2.13.1

## 0.2.1

### Patch Changes

- Fix package description

## 0.2.0

### Minor Changes

- Update OpenAPI schema and docs

## 0.1.1

### Patch Changes

- Fix keywords

## 0.1.0

- Initial release 🎉
- Added ApiShip fulfillment provider for Medusa
