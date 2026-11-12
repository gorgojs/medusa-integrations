# @gorgo/medusa-integration

## 2.0.0

### Highlights

The Integration Module moves from 0.3 to 2.0 and takes the same major version as Medusa v2 and the Gorgo payment and fulfillment integrations built on it. Every Gorgo integration built on the module and released today requires `@gorgo/medusa-integration@^2.0.0`, so the version numbers say what works together. The upgrade needs Medusa v2.21.0 or later and a database migration, and nothing else in a project without its own code on top of the module. See Upgrade Guide and Breaking Changes below for the steps.

#### Settings Change History

The module records every change to an integration's settings. A record names the author, the time, and each field that changed, with its value before and after. For an option marked `secret: true`, it keeps only what happened to the value, which is `set`, `replaced`, or `removed`, so secrets never reach the history. The record also keeps the IP address, the client, and the ID of the request.

In Medusa Admin, the **Change History** section of an integration's page shows its five latest changes, and the **Change History** page under **Settings → Integrations** lists the changes of every integration. Search the table by the author's email, the integration's name, or a changed field. Filter it by integration, event, author, and date, and sort it by time, integration, event, or author. A change opens in a side panel with every changed field as "before → after" and a **Copy as JSON** button. The page address holds the search, the filters, and the sorting, so you can share a link to a filtered history.

The history is kept indefinitely and outlives the integration it describes, so a deleted integration still shows how it was configured. The module writes the record in the same workflow run that makes the change. A change made in the Admin is attributed to the admin user, a change made with an API key to that key, and a change your own code makes without an actor to **System**. To attribute it to the signed-in admin user, pass the actor to the workflow:

```ts
await upsertIntegrationWorkflow(req.scope).run({
  input: {
    provider_id: "int_my_default",
    values: { sandbox: false },
    actor: { type: req.auth_context.actor_type, id: req.auth_context.actor_id },
  },
})
```

Read the history through the new `/admin/integrations/changes` routes of the Admin API or through the module's service. The `integration.updated` event now carries the actor and the ids of the changed fields. Refer to [Settings Change History](https://docs.gorgojs.com/medusa-modules/integration/change-history) for what the module records and to [View the Change History in Medusa Admin](https://docs.gorgojs.com/medusa-modules/integration/view-change-history) for the Admin.

#### Every Registration Names Its Instance

A provider registered without an `id` is now the instance `default`, keyed `int_<identifier>_default`, so every stored `provider_id` names its instance, the same as a registration with an `id`. `getInstanceId()` returns `"default"` instead of `null`, `instance_id` in the Admin API is always a string, and the package root exports `DEFAULT_INSTANCE_ID`. The settings and the change history saved under the old key, `int_<identifier>`, move to the new one when `medusa db:migrate` runs. Nothing moves into a default instance that already has settings, into a named instance, or out of a key that a registration still uses.

The module now refuses to start when a key is registered twice, which is two entries of `options.providers` with the same provider and the same `id`, or an entry with `id: "default"` next to one without an `id`. Before, the second registration replaced the first one silently.

#### Metadata and the JSON Section

An integration and each record of its change history carry `metadata`, free-form data of your own code, as on any Medusa entity. `POST /admin/integrations/:provider_id` and `upsertIntegrationWorkflow` merge it into the stored metadata key by key, and `values` became optional, so a request can change the metadata alone. The module never reads it, and the change history doesn't list it. The integration's page in Medusa Admin gains a **JSON** section with the stored record as the Admin API returns it, last on the page like on Medusa's own detail pages.

#### Four More Categories

A descriptor can declare the categories `tax`, `subscriptions`, `reviews`, and `admin`, and the Admin groups and filters integrations by them. The release also drops a leftover check constraint that the first migration had declared under the column's old name. It still rejected `search`, `content`, `analytics`, `authentication`, and `file_providers`, so an integration of those categories couldn't be saved.

#### A Format Version for Stored Secrets

The module now stores every encrypted secret as `v1:` followed by the same base64 of the IV, the auth tag, and the ciphertext as before. A value without the prefix is one that 0.3.x wrote, and the module reads it as before, so the upgrade re-encrypts nothing. Base64 has no `:`, so the two formats can't be confused. The version leaves room for an external secret store and key rotation in a later 2.x release, with no further major version. When a value is stored in a format the installed module doesn't know, the error names that format and asks for an upgrade.

#### Reading Across a Secret Flag Change

Changing an option's `secret` flag after a store admin has saved it no longer breaks the integration. A newly secret option keeps its plain-text value until the next save encrypts it, and an option that is no longer secret has its stored value decrypted when the module reads it. When a secret can't be decrypted, because `encryptionKey` is missing or changed or the value is in a format version the installed module doesn't know, the module throws a `MedusaError` of type `unexpected_state` that names the option and the integration. An Admin API route answers with that message instead of the generic `An unknown error occurred.`, and the Admin shows it in the notification. The connection test reports such an error as `failed` with the message, and deleting the settings works without the right key, so a lost key no longer blocks the way out.

#### Search Integrations by Name

The search on the **Integrations** page matches an integration's name and description in the interface language, as well as its identifier and instance. The search of the change history matches the integration's name the same way.

#### Warnings for Provider Authors

At startup, the module now warns about every option whose name looks like a credential but isn't declared `secret: true`, because its value is shown in the Admin and kept in the change history in clear text. It also warns when two providers declare the same `identifier`. Such a configuration started silently before, with both providers sharing the package details, the license check and, without an `id`, one settings record. The warning names both providers. 2.x warns, and 3.0 will refuse to start.

#### Translations in the `gorgo` Namespace

The Admin resolves an i18n key of a descriptor in the `gorgo` namespace first, then in Medusa's default `translation` namespace, so a provider ships its translations from `src/admin/i18n/index.ts` under either one. A key in another namespace takes the `namespace:key` form. The module and every Gorgo integration now keep their translations under `gorgo`.

#### AbstractIntegrationProviderService

The base class of a provider is now `AbstractIntegrationProviderService`, in step with Medusa's `AbstractFulfillmentProviderService` and `AbstractNotificationProviderService`. `AbstractIntegrationProvider` stays as a deprecated alias through every 2.x release, so a provider written for 0.x keeps working without a change. The alias goes away in 3.0.

#### Value Lists Across Versions

The descriptor reference now says what a release may do to the descriptor's fixed value lists, which are `category`, an option's `type` and `control`, a section's `column`, `preferredLayoutId`, and the `status` that `testConnection` returns. A new value arrives in a minor release. A value is removed or renamed only in a major release. Code that branches on one of these values should handle a value it doesn't know. The JSDoc of each list says the same, so an editor shows the rule on hover.

#### More Exports From the Package Root

The package root now exports every workflow of the module, which adds `deleteIntegrationWorkflow`, `setIntegrationEnabledWorkflow`, and `testIntegrationConnectionWorkflow` next to `upsertIntegrationWorkflow`, with their input types. It also exports the types the service returns, which are `Integration`, `IntegrationChange`, `UiDescriptor`, `UiSection`, `UiField`, `IntegrationOverviewItem`, `IntegrationOverviewQuery`, `IntegrationOverviewResult`, `CatalogItem`, `LicenseStateEntry`, `IntegrationChangeUser`, and `IntegrationChangeField`. The service gains `readPlainOptions(record)`, which returns the stored options with the secrets left as stored and never throws, so the Admin can show a record whose secrets no longer decrypt.

#### New Documentation

The [documentation](https://docs.gorgojs.com/medusa-modules/integration) of the module was rewritten. It gains references of the Admin API routes, the workflows, the service, the data models, the events, the validation rules, and the localization, guides to custom sections and the admin widget zones, user guides for the Admin, and diagrams of the roles, the read path, and the startup on the concepts page.

### Upgrade Guide

A project that uses the module and the Gorgo integrations needs the first two steps. The third one is for a project with its own code on top of the module.

#### 1. Update Medusa and the Packages

The module requires Medusa v2.21.0 or later. Update the module and every Gorgo integration in one step, so the peer dependencies stay satisfied. Replace the YooKassa package with the integrations your project uses:

```bash
yarn add @gorgo/medusa-integration@^2.0.0 @gorgo/medusa-payment-yookassa@^2.1.0
```

These versions work with 2.0:

| Package | Version |
| --- | --- |
| `@gorgo/medusa-payment-yookassa` | 2.1.0 |
| `@gorgo/medusa-payment-tkassa` | 2.1.0 |
| `@gorgo/medusa-payment-robokassa` | 2.1.0 |
| `@gorgo/medusa-payment-stripe` | 2.1.0 |
| `@gorgo/medusa-payment-paypal` | 2.1.0 |
| `@gorgo/medusa-payment-authorizenet` | 2.1.0 |
| `@gorgo/medusa-payment-mollie` | 2.1.0 |
| `@gorgo/medusa-fulfillment-apiship` | 2.2.0 |
| `@gorgo/medusa-1c` | 0.4.0 |
| `@gorgo-store/medusa-erp-1c` | 0.4.0 |

#### 2. Run the Migrations

The change history lives in the new `integration_change` table, `metadata` is a new column of `integration` and `integration_change`, and the category check gains the new values. The migrations also move the settings and the history of every registration without an `id` from `int_<identifier>` to `int_<identifier>_default`. Run them and restart the server:

```bash
npx medusa db:migrate
```

Until the migrations run, every change goes ahead without a record, the module logs a warning, and an integration registered without an `id` reads no settings, because the module looks for them under the new key. The settings and the secrets saved on 0.3.x are read as before, and the module re-encrypts nothing.

#### 3. Check Your Own Code

- A subscriber of `integration.updated` that branches on `change` handles the new `"disabled"` value.
- Code that builds or compares the `provider_id` of a registration without an `id` uses `int_<identifier>_default` instead of `int_<identifier>`. `integrationProviderKey(identifier)` returns the new key, and `parseIntegrationProviderKey` returns `instanceId: "default"` for it and `null` for the old key.
- Code that reads `supports_multiple_instances` from `GET /admin/integrations` drops it.
- Code that catches the module's `encryptionKey` errors as a plain `Error` handles a `MedusaError` of type `unexpected_state`.
- Code that deep-imports a compiled file of the module imports it from the root, `./workflows`, `./modules/*`, or `./admin` instead. The root now exports every type a provider's declarations need.
- A provider of your own keeps working as it is. Rename its base class from `AbstractIntegrationProvider` to `AbstractIntegrationProviderService` at your own pace, before 3.0. Remove `supportsMultipleInstances` from its descriptor if it declares it. `getInstanceId()` now returns `"default"` for a registration without an `id`, so a check for `null` is never true. If the provider is published with its declarations, rebuild it against 2.0, so its `.d.ts` files stop deep-importing the module.

To go back to 0.3.x after the upgrade, enter the secrets saved on 2.0 again, because 0.3.x doesn't read the new format, and expect 0.3.x to look for the settings of a registration without an `id` under the old key.

### Breaking Changes

- **Medusa v2.21.0 or later.** The module's peer dependencies on the `@medusajs/*` packages moved from `^2.17.2` to `^2.21.0`.
- **The upgrade needs migrations.** The module keeps the history in the new `integration_change` table, adds `metadata` to `integration` and `integration_change`, extends the category check, and moves the settings of every registration without an `id` to its new key. Until the migrations run, every change goes ahead without a record, the module logs a warning, and an integration registered without an `id` reads no settings.
- **A registration without an `id` is the instance `default`.** Its key is `int_<identifier>_default` instead of `int_<identifier>`, `getInstanceId()` returns `"default"` instead of `null`, `instance_id` in the Admin API is always a string, and `parseIntegrationProviderKey` returns `null` for the old key.
- **A duplicate registration refuses to start.** Two entries of `options.providers` with the same provider and the same `id`, or an entry with `id: "default"` next to one without an `id`, throw at startup. Before, the second registration replaced the first one silently.
- **`supportsMultipleInstances` is gone.** The descriptor field and the `supports_multiple_instances` flag of `GET /admin/integrations` are removed. The module registers every entry of `options.providers` either way.
- **Gorgo integrations require 2.x.** The versions listed above declare `@gorgo/medusa-integration@^2.0.0` as a peer dependency, and their earlier versions declare `>=0.1.5 <1.0.0`, so update the module and the integrations together.
- **Narrowed package exports.** `@gorgo/medusa-integration` no longer exports `./*` and `./providers/*`. The entries that stay are the root, `./workflows`, `./modules/*`, `./admin`, and `./package.json`. A deep import of any other compiled file fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. The root now also exports the `IntegrationSection`, `IntegrationValidateContext`, `IntegrationValidateIssue`, and `IntegrationLayouts` types, so the declarations of a provider written by the guide build without a deep import.
- **`integration.updated` says `"disabled"`.** When an integration is turned off, the event's `change` is now `"disabled"`. Before, both enabling and disabling arrived as `"enabled"`. A subscriber that branches on `change` needs the new value.
- **Encryption errors are `MedusaError`s.** When `encryptionKey` is missing, isn't the key a secret was saved with, or a secret is stored in a format version the module doesn't know, the module throws a `MedusaError` of type `unexpected_state` with a message that names the option and the integration. Before, it threw a plain `Error` or Node.js's own decryption error, and an Admin API route answered `500` with a generic message.
- **No downgrade after a secret is saved.** A secret saved on 2.0 is stored with the format version above, and 0.3.x can't read it. A downgrade needs the secrets entered again.
- **Deprecated.** `AbstractIntegrationProvider` is an alias of `AbstractIntegrationProviderService` and goes away in 3.0.

### Features

- record a change history of integration settings by [@KaneFlak](https://github.com/KaneFlak) in [`1816e1b`](https://github.com/gorgojs/medusa-integrations/commit/1816e1bbc48469688b544112ca5051fe6733921a)

- add read routes for the integration settings change history by [@KaneFlak](https://github.com/KaneFlak) in [`e8b24be`](https://github.com/gorgojs/medusa-integrations/commit/e8b24bed732faa84e15318279a794bb1c72ba9be)

- show the change history on the integration page by [@KaneFlak](https://github.com/KaneFlak) in [`f05acb2`](https://github.com/gorgojs/medusa-integrations/commit/f05acb214db99ccdc3c416fd15e0672c4c44de13)

- add the change history page with search and the change card by [@KaneFlak](https://github.com/KaneFlak) in [`781667a`](https://github.com/gorgojs/medusa-integrations/commit/781667add8d62cc1332ed603e0d66fa6008000a0)

- filter the change history by author and search it by the options changed by [@KaneFlak](https://github.com/KaneFlak) in [`f8b923a`](https://github.com/gorgojs/medusa-integrations/commit/f8b923ae928b3afaf230c33d93455205dc189c7f)

- search integrations by their translated names and descriptions by [@KaneFlak](https://github.com/KaneFlak) in [`3e0c6aa`](https://github.com/gorgojs/medusa-integrations/commit/3e0c6aae7b65162693cca8bda175f30e36c2ea55)

- warn at startup when two providers declare the same identifier by [@gorgohead](https://github.com/gorgohead) in [`54dea0a`](https://github.com/gorgojs/medusa-integrations/commit/54dea0a858a8815eef28ac0270999e95db9bec67)

- store secrets with a format version and keep reading the unversioned ones by [@gorgohead](https://github.com/gorgohead) in [`70824d0`](https://github.com/gorgojs/medusa-integrations/commit/70824d0fd91664f2f272642ea245d7a61c648a44)

- register a provider without an id as the instance default, move its saved settings there on db:migrate and refuse a duplicate registration by [@KaneFlak](https://github.com/KaneFlak) in [`5559627`](https://github.com/gorgojs/medusa-integrations/commit/5559627ce9a862e594572a65180d18b33e09720e)

- drop supportsMultipleInstances from the descriptor and the admin api by [@KaneFlak](https://github.com/KaneFlak) in [`0638d44`](https://github.com/gorgojs/medusa-integrations/commit/0638d4431d2c14d03546e093b6e057ff0d624d27)

- show the integration json on its page and add metadata to integrations and their changes by [@KaneFlak](https://github.com/KaneFlak) in [`e0b3e5b`](https://github.com/gorgojs/medusa-integrations/commit/e0b3e5b9de8db997893ea86b4a7071796be9cf19)

- move the admin translations to the gorgo namespace by [@KaneFlak](https://github.com/KaneFlak) in [`8098d63`](https://github.com/gorgojs/medusa-integrations/commit/8098d63a6b4c516df11ecb7ff48fcb304bebae85)

- add the tax, subscriptions, reviews and admin categories by [@gorgohead](https://github.com/gorgohead) in [`e384a02`](https://github.com/gorgojs/medusa-integrations/commit/e384a026a3fe7780622180d4472cbe44ccc51071)

### Bug Fixes

- translate the pagination of the integrations and change history tables by [@KaneFlak](https://github.com/KaneFlak) in [`0bb06ad`](https://github.com/gorgojs/medusa-integrations/commit/0bb06ad0cce2d7e3db845cf3d501f4b71be74e99)

- fit the field badges of the change history table to its width by [@KaneFlak](https://github.com/KaneFlak) in [`dfe38d7`](https://github.com/gorgojs/medusa-integrations/commit/dfe38d7382c1c9d3a7ab94e860ce5c2ff5f6b703)

- send disabled in the integration.updated event when an integration is turned off by [@gorgohead](https://github.com/gorgohead) in [`2128829`](https://github.com/gorgojs/medusa-integrations/commit/2128829e896c1d11c513bef4645d63fae8a9b6e2)

- drop the leftover category check, read secrets across a secret flag change, report encryption key errors as MedusaError and export the service types and workflows from the root by [@KaneFlak](https://github.com/KaneFlak) in [`b245203`](https://github.com/gorgojs/medusa-integrations/commit/b24520317669b4534ea5970db0e06ac916a2cc61)

### Refactoring

- rename AbstractIntegrationProvider to AbstractIntegrationProviderService with a deprecated alias by [@KaneFlak](https://github.com/KaneFlak) in [`1c91b2a`](https://github.com/gorgojs/medusa-integrations/commit/1c91b2a16f7000ffdd47a07e424981d60a7d7c07)

- rename the integration state step to the integration snapshot step by [@gorgohead](https://github.com/gorgohead) in [#533](https://github.com/gorgojs/medusa-integrations/pull/533) ([`b31492b`](https://github.com/gorgojs/medusa-integrations/commit/b31492b2c5553e25ef548dd1fbb44729eaa66eaf))

- narrow the package exports and export the descriptor types from the root by [@gorgohead](https://github.com/gorgohead) in [`3caa0f7`](https://github.com/gorgojs/medusa-integrations/commit/3caa0f7387ad12bcf9aefdce034ccb8a78206ea0)

### Documentation

- list the change history among the readme features by [@KaneFlak](https://github.com/KaneFlak) in [`a2890a1`](https://github.com/gorgojs/medusa-integrations/commit/a2890a1f27293905bb83152b7ae4fbfaf1d73f4c)

- sync the readme with the docs and add the migration step by [@gorgohead](https://github.com/gorgohead) in [`ade505c`](https://github.com/gorgojs/medusa-integrations/commit/ade505c588d14a94003c6ee9667162c42131dee3)

- keep the AbstractIntegrationProvider alias through every 2.x release by [@gorgohead](https://github.com/gorgohead) in [`39de906`](https://github.com/gorgojs/medusa-integrations/commit/39de906ab58f58485e87a1e092107567af7b5ee8)

- write down how the descriptor value lists change between versions by [@gorgohead](https://github.com/gorgohead) in [`ce37a49`](https://github.com/gorgojs/medusa-integrations/commit/ce37a49d3fc9650402ea81b2302ee89c4ccbe249)

- move the demo video to the per-locale cuts by [@gorgohead](https://github.com/gorgohead) in [`898ec38`](https://github.com/gorgojs/medusa-integrations/commit/898ec38ff61d52958270ce516509999e9842f2f3)

## 0.3.3

### Bug Fixes

- regenerate the offline catalog with authorizenet and mollie by [@gorgohead](https://github.com/gorgohead) in [`d61f97d`](https://github.com/gorgojs/medusa-integrations/commit/d61f97d5b256cf023b472584602501c300f2cc81)

## 0.3.2

### Documentation

- show the medusa-config registration in the readme by [@ttokyose](https://github.com/ttokyose) in [#521](https://github.com/gorgojs/medusa-integrations/pull/521) ([`598245d`](https://github.com/gorgojs/medusa-integrations/commit/598245ddd374177258ba9283baa0ba70222f9620))

## 0.3.1

### Documentation

- link the maintenance page from the readme by [@gorgohead](https://github.com/gorgohead) in [`2fb0875`](https://github.com/gorgojs/medusa-integrations/commit/2fb08758227db11067eca108c387e67863cb8f24)

## 0.3.0

### Highlights

- **Gorgo License for paid integrations.** A paid integration declares `"gorgo": { "license": "required" }` in its `package.json`, and the module checks its license against the project key in `GORGO_LICENSE`. Open-source integrations are not checked at all. Without a paid integration installed, the module never contacts the license service, and a free integration shows no license in the Admin.
- **The verdict is in the Admin.** A paid integration gets a license line in the integrations table and a license block on its page, with the subscription end date, what to fix when the check fails and a link to the Gorgo account. **Check now** reruns the check right away, for example after you add a domain or renew the subscription.
- **Never blocks the server.** The check runs in the background after startup and then once a day, all paid integrations in one request. If the license service is unreachable, it tries again in 15 minutes.

### Bug Fixes

- add minor UI fixes by [@gorgohead](https://github.com/gorgohead) in [#516](https://github.com/gorgojs/medusa-integrations/pull/516) ([`793f377`](https://github.com/gorgojs/medusa-integrations/commit/793f37765387f9342355f844587a0f9869a9f81a))

## 0.2.9

### Bug Fixes

- require node.js 22.23.4, 24.22.1, 26.12.1 or later by [@gorgohead](https://github.com/gorgohead) in [#514](https://github.com/gorgojs/medusa-integrations/pull/514) ([`9402e4a`](https://github.com/gorgojs/medusa-integrations/commit/9402e4a7199405fbf1ad82ad5aeae871abee68db))

### Dependencies

- Updated dependencies:
  - @gorgo/telemetry@1.4.1

## 0.2.8

### Bug Fixes

- regenerate the offline catalog with the 1c beta note by [@gorgohead](https://github.com/gorgohead) in [`e770894`](https://github.com/gorgojs/medusa-integrations/commit/e77089494b9670e70041043d09be076b1921c99f)

## 0.2.7

### Bug Fixes

- make the catalog repository optional for paid integrations by [@gorgohead](https://github.com/gorgohead) in [`9f5a619`](https://github.com/gorgojs/medusa-integrations/commit/9f5a619e3c05d5ac218b3ca310beff574b7fc463)

- regenerate the offline catalog with both 1c editions by [@gorgohead](https://github.com/gorgohead) in [`2e31475`](https://github.com/gorgojs/medusa-integrations/commit/2e31475ad8fcf7281cccbd0ab6a8aa744ceb560b)

## 0.2.6

### Documentation

- point the demo video at its versioned file by [@gorgohead](https://github.com/gorgohead) in [`f7f7099`](https://github.com/gorgojs/medusa-integrations/commit/f7f7099b92df948ab082b755da30ce51cc946074)

## 0.2.5

### Bug Fixes

- point the missing encryption key error at the plugin options by [@gorgohead](https://github.com/gorgohead) in [`5df6552`](https://github.com/gorgojs/medusa-integrations/commit/5df655284343e0e2c5d5352dc96493f18525fe81)

## 0.2.4

### Documentation

- point the demo videos at their new addresses by [@gorgohead](https://github.com/gorgohead) in [`9a44e5b`](https://github.com/gorgojs/medusa-integrations/commit/9a44e5b4b3de0926ab7daaa0f8c7c275b506c532)

## 0.2.3

### Documentation

- add a text link to the demo video in the readme by [@gorgohead](https://github.com/gorgohead) in [`65daddd`](https://github.com/gorgojs/medusa-integrations/commit/65daddd868ef0ac8b0f41813d2cc19ec8f21ebbc)

## 0.2.2

### Bug Fixes

- add Swedish translations by [@gorgohead](https://github.com/gorgohead) in [`3c8676e`](https://github.com/gorgojs/medusa-integrations/commit/3c8676e6066901a61e4f3296e3e1b0e57bc81800)

## 0.2.1

### Chores

- update dependencies and peerDependencies across multiple packages by [@gorgohead](https://github.com/gorgohead) in [`10ecafc`](https://github.com/gorgojs/medusa-integrations/commit/10ecafcee59483b46d66a1d101ee1baa0b126e5a)

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
