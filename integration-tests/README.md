# Integration Tests

Per-plugin workspace packages (`@gorgo/it-<plugin>`) that boot a real Medusa app with the plugin loaded via `workspace:*` and exercise it through [`@medusajs/test-utils`](https://docs.medusajs.com/learn/debugging-and-testing/testing-tools).

Each package has two test types:

- `test:integration:http` — API/route level, in `__tests__/http/*.spec.ts`
- `test:integration:modules` — module/service level, in `__tests__/modules/*.spec.ts`

## Prerequisites

- Node.js v22.23.4, v24.22.1, v26.12.1 or later, Yarn
- A running PostgreSQL. Connection is read from each package's `.env.test` (defaults to `postgres://postgres:postgres@localhost:5432/medusa-test`); a temporary test database is created and dropped per run. The quickest way to get one is [`examples/docker-compose.yml`](../examples/docker-compose.yml).

## Running

From the monorepo root:

```bash
yarn test:integration         # all integration tests across integration-tests/*
yarn test:changed             # unit + integration only for packages changed vs origin/main
```

For a single plugin:

```bash
cd integration-tests/<plugin>
yarn test                     # both http and modules
yarn test:integration:http    # http only
```

## Contract tests

Some payment plugins include `*.contract.spec.ts` that hit the provider's live sandbox. They are skipped unless sandbox credentials are present — copy `.env.test.template` to `.env.test` and fill in the `CI_*` variables.

## CI

[`.github/workflows/test.yml`](../.github/workflows/test.yml) runs these against a PostgreSQL service on pull requests, pushes to `main`, a daily schedule, and `workflow_dispatch`.
