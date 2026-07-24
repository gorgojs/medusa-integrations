<p align="center">
  <a href="https://www.medusajs.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/gorgo-logo-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/gorgo-logo-light.svg">
      <img alt="Gorgo logo" src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/gorgo-logo-light.svg" height="58">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa Plugins<br>
  by Gorgo
</h1>

<h4 align="center">
  <a href="https://docs.gorgojs.com">Documentation</a> |
  <a href="https://gorgojs.com">Website</a>
</h4>

<p align="center">
  A production-ready suite of <a href="https://medusajs.com/">Medusa</a> plugins built for Russia and CIS markets — payments, fulfillment, ERP, and marketplaces, with example apps and documentation.
</p>

<p align="center">
  <a href="https://github.com/gorgojs/medusa-integrations/blob/HEAD/README.ru.md">Читать README на русском ↗</a>
</p>

<p align="center">
  <a href="https://t.me/gorgojs_chat">
    <img src="https://img.shields.io/badge/Telegram-Support_Chat-0088cc?logo=telegram&style=social" alt="Telegram Support Chat" />
  </a>
</p>

<p align="center">
  <a href="https://t.me/medusajs_chat">
    <img src="https://img.shields.io/badge/Telegram-Medusa.js_Dev_Community_Chat-0088cc?logo=telegram&style=social" alt="Medusa.js Dev Community Chat on Telegram" />
  </a>
</p>

## Medusa Plugins

<p>
  <a href="./packages/medusa-payment-yookassa">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/yookassa-logo.svg" width="80" align="left" alt="Yookassa logo">
  </a>
  <strong><a href="./packages/medusa-payment-yookassa">Yookassa</a></strong><br/>
  Payment provider with hosted checkout, webhook handling, refunds, fiscal receipts, and a storefront example.
  <br/>
  <a href="https://docs.gorgojs.com/medusa-plugins/yookassa">docs</a> |
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-yookassa">npm</a> |
  <a href="./examples/payment-yookassa">example</a>
</p>

##

<br clear="left"/>

<p>
  <a href="./packages/medusa-payment-tkassa">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/tkassa-logo.svg" width="80" align="left" alt="T-Kassa logo">
  </a>
  <strong><a href="./packages/medusa-payment-tkassa">T-Kassa by T-Bank</a></strong><br/>
  Payment provider with payment initialization, webhook handling, refunds, receipt support, and a storefront example.<br/>
  <a href="https://docs.gorgojs.com/medusa-plugins/t-kassa">docs</a> |
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-tkassa">npm</a> |
  <a href="./examples/payment-tkassa">example</a>
</p>

##

<br clear="left"/>

<p>
  <a href="./packages/medusa-payment-robokassa">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/robokassa-logo.svg" width="80" align="left" alt="Robokassa logo">
  </a>
  <strong><a href="./packages/medusa-payment-robokassa">Robokassa</a></strong><br/>
  Payment provider with hosted checkout flows, notifications, refunds, receipt generation, and example storefront integration.<br/>
  <a href="https://docs.gorgojs.com/medusa-plugins/robokassa">docs</a> |
  <a href="https://www.npmjs.com/package/@gorgo/medusa-payment-robokassa">npm</a> |
  <a href="./examples/payment-robokassa">example</a>
</p>

##

<br clear="left"/>

<p>
  <a href="./packages/medusa-fulfillment-apiship">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/apiship-logo.svg" width="80" align="left" alt="ApiShip logo">
  </a>
  <strong><a href="./packages/medusa-fulfillment-apiship">ApiShip</a></strong><br/>
  Fulfillment provider with delivery rate calculation, shipment creation, pickup-point delivery, document retrieval, and Admin tooling.<br/>
  <a href="https://docs.gorgojs.com/medusa-plugins/apiship">docs</a> |
  <a href="https://www.npmjs.com/package/@gorgo/medusa-fulfillment-apiship">npm</a> |
  <a href="./examples/fulfillment-apiship">example</a>
</p>

##

<br clear="left"/>

<p>
  <a href="./packages/medusa-1c">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/1c-logo.svg" width="80" align="left" alt="1C:Enterprise logo">
  </a>
  <strong><a href="./packages/medusa-1c">1C:Enterprise</a></strong><br/>
  Integration for synchronizing catalog and order data between Medusa and 1C:Enterprise, with an example backend.<br/>
  <a href="https://docs.gorgojs.com/medusa-plugins/1c-enterprise">docs</a> |
  <a href="https://www.npmjs.com/package/@gorgo/medusa-1c">npm</a> |
  <a href="./examples/1c">example</a>
</p>

##

<br clear="left"/>

<p>
  <a href="./packages/medusa-feed-yandex">
    <img src="https://raw.githubusercontent.com/gorgojs/medusa-integrations/refs/heads/main/assets/yandex-logo.svg" width="80" align="left" alt="Yandex Market logo">
  </a>
  <strong><a href="./packages/medusa-feed-yandex">Yandex Market YML Feed</a></strong><br/>
  Feed generator that exports catalog data in YML format and exposes feed management through Medusa Admin.<br/>
  <a href="https://docs.gorgojs.com/medusa-plugins/yandex-yml-feed">docs</a> |
  <a href="https://www.npmjs.com/package/@gorgo/medusa-feed-yandex">npm</a> |
  <a href="./examples/feed-yandex">example</a>
</p>

##

<br clear="left"/>

## Repo Structure

This repository is organized as a Yarn monorepo with shared workspaces for plugin packages.

```text
├── examples/
│   ├── 1c/
│   ├── feed-yandex/
│   ├── fulfillment-apiship/
│   ├── payment-robokassa/
│   ├── payment-tkassa/
│   └── payment-yookassa/
├── integration-tests/
│   ├── 1c/
│   ├── feed-yandex/
│   ├── fulfillment-apiship/
│   ├── payment-robokassa/
│   └── payment-tkassa/
├── packages/
│   ├── medusa-1c/
│   ├── medusa-feed-yandex/
│   ├── medusa-fulfillment-apiship/
│   ├── medusa-payment-robokassa/
│   ├── medusa-payment-tkassa/
│   ├── medusa-payment-yookassa/
│   └── utils/
│       └── gorgo-telemetry/
├── scripts/
└── docs/
    ├── medusa-plugins/
    └── tools/
```

### `packages/`

Published Medusa plugins live here. Each package contains its own source code, package manifest, changelog, and package-level README. Shared internal utilities live under `packages/utils/` (e.g. `@gorgo/telemetry`).

### `examples/`

Examples are grouped by plugin and usually include:

- `medusa/` for a backend project configured with the plugin.
- `medusa-storefront/` for a storefront integration example when the plugin needs frontend work.

A root [examples/docker-compose.yml](examples/docker-compose.yml) spins up PostgreSQL and pgAdmin for the example apps. See [examples/README.md](examples/README.md).

### `integration-tests/`

Per-plugin workspace packages that boot a real Medusa app with the plugin loaded via `workspace:*`. See [Tests](#tests) below.

### `scripts/`

Repository automation scripts (Medusa version updates, changeset generation, release helpers).

### `docs/`

Documentation content (MDX + announcements), published at:

- [docs.gorgojs.com](https://docs.gorgojs.com)
- [docs.gorgojs.ru](https://docs.gorgojs.ru)

`medusa-plugins/` holds per-plugin docs; `tools/` holds docs for related CLIs such as [`create-medusa-plugin`](https://docs.gorgojs.com/tools/create-medusa-plugin).

## Installation & Development

### Working on a plugin package

Install root dependencies:

```bash
yarn install
```

Then move into the package you want to work on and run its development command, for example for T-Kassa:

```bash
cd packages/medusa-payment-tkassa
yarn dev
```

### Working on an example app

See the plugin example README for details:

- [examples/1c/README.md](examples/1c/README.md)
- [examples/feed-yandex/README.md](examples/feed-yandex/README.md)
- [examples/fulfillment-apiship/README.md](examples/fulfillment-apiship/README.md)
- [examples/payment-robokassa/README.md](examples/payment-robokassa/README.md)
- [examples/payment-tkassa/README.md](examples/payment-tkassa/README.md)
- [examples/payment-yookassa/README.md](examples/payment-yookassa/README.md)

## Tests

The repository runs two kinds of tests, orchestrated by [Turborepo](https://turborepo.com):

- **Unit tests** live next to source in each plugin (`packages/medusa-<plugin>/src/**/__tests__/*.unit.spec.ts`).
- **Integration tests** live in dedicated workspace packages (`integration-tests/<plugin>/`) that boot a real Medusa app with the plugin loaded via `workspace:*`. See [integration-tests/README.md](integration-tests/README.md) for prerequisites and running.

From the monorepo root:

```bash
yarn test:unit                # all unit tests across packages/medusa-*
yarn test:integration         # all integration tests across integration-tests/*
yarn test:changed             # unit + integration only for packages changed vs origin/main
```

From a single plugin package (for active development):

```bash
cd packages/medusa-<plugin>
yarn test:unit
```

CI runs unit tests on every PR (only for changed plugins) and the full suite on push to `main` and `workflow_dispatch`. See [.github/workflows/test.yml](.github/workflows/test.yml).

## Contribution

Contributions are welcome across packages, examples, and docs! Here is a little instruction about how to do it.

Before opening a Pull Request:

1. Make changes in the relevant package, example, or documentation entry.
2. Run the local commands needed for the area you touched, such as `yarn build`, `yarn dev`, or `yarn test:changed` to verify tests still pass.
3. Update documentation when behavior, configuration, or setup changes.
4. Keep commits [conventional](https://www.conventionalcommits.org/en/v1.0.0/), focused and scoped. The repository uses `commitlint` and automated release tooling.   
  Commit message format:  
    ```
    feat(scope): commit message
    ```  
    Package scopes:
   - `1c`
   - `feed-yandex`
   - `fulfillment-apiship`
   - `payment-robokassa`
   - `payment-tkassa`
   - `payment-yookassa`
   - `gorgo-telemetry`

    Plus repo-level scopes: `deps`, `release`, `docs`, `root`. Run `yarn scopes` to print the current list.  

## License

Published plugin packages are released under the MIT License. See each package's `LICENSE` file for the exact terms.
