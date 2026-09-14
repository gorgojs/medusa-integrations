# Examples for Medusa Gorgo plugins 

Handy examples for Medusa Gorgo plugins.

## Prerequisites

- Node.js v20+
- Yarn, and pnpm v10+ for the examples built on the Medusa DTC Starter
- Docker & Docker Compose (optional, for spinning up PosgreSQL)

## Two Shapes of Example

An example comes in one of two shapes, and the commands below depend on which one you picked.

| Shape | Directories | Package manager | Examples |
|---|---|---|---|
| Two projects | `medusa/`, `medusa-storefront/` | Yarn | `erp-1c`, `fulfillment-apiship` |
| One workspace, scaffolded from the [Medusa DTC Starter](https://github.com/gorgojs/medusa-dtc-starter) | `apps/backend/`, `apps/storefront/` | pnpm | `all-integrations`, `feed-yandex`, `payment-robokassa`, `payment-tkassa`, `payment-yookassa` |

The starter ships a storefront with 36 languages, 241 seeded countries, transactional emails and a
conversion-focused checkout, so an example built on it shows the plugin in a shop that already looks
like a shop. Read the example's own `README.md` first, since it names the shape and the variables the
plugin needs.

## Installation & Development

To install any example do the following:

1. Clone the repository and change to examples:
   ```bash
   git clone https://github.com/gorgojs/medusa-integrations
   cd medusa-integrations
   ```

2. (optional) Install PostgreSQL and pgAdmin using Docker Compose:
   ```bash
   cd examples
   docker compose up -d
   ```
   By default, it creates databases for all the examples and a `postgres` user **without a password**.
   
   The PostgreSQL is available at `postgres://postgres@localhost`, and the pgAdmin at http://localhost:8080

   ✅ You can skip this step if you’re using a different PostgreSQL instance.

3. (optional, only for plugin development) Install any **Medusa plugin** in local:
   ```bash
   # Open a separate terminal window and run
   cd packages/choose-your-plugin
   
   # Install
   yarn

   # Publish locally and develop by watching changes
   yarn dev

   # Keep the terminal window opened...
   ```

   ✅ You can skip this step if not developing the plugin.

### Two-Project Examples

4. Install and run the **Medusa example**:
   ```bash
   # Open a separate terminal window and change to any example
   cd ./examples/choose-your-example/medusa

   # Set up environment variables
   cp .env.template .env
   # and configure your variables properly inside .env
   
   # Install
   yarn

   # Migrate the database
   yarn db:migrate

   # (optional) Create an admin user 
   npx medusa user -e admin@medusajs.com -p supersecret

   # (optional) Seed data
   yarn seed

   # Run
   yarn dev # for development
   yarn build && yarn start  # for production

   # Keep the terminal window opened...
   ```

5. Install and run the **Medusa Storefront example**:
   ```bash
   # Open a separate terminal window and change to any example
   cd ./examples/choose-your-example/medusa-storefront

   # Set up environment variables
   cp .env.template .env
   # and configure your own `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` inside .env
   
   # Run
   yarn dev # for development
   yarn build && yarn start # for production

   # Eliminate terminal errors with settings in Medusa admin

   # Keep the terminal window opened...
   ```

### Medusa DTC Starter Examples

4. Install the workspace and set up both environment files:
   ```bash
   cd ./examples/choose-your-example

   # Install the backend and the storefront in one go
   pnpm install

   # Set up environment variables
   cp apps/backend/.env.template apps/backend/.env
   cp apps/storefront/.env.template apps/storefront/.env.local
   # and configure your variables properly inside both files
   ```

5. Migrate, create the admin user and seed the demo catalog:
   ```bash
   cd apps/backend

   pnpm medusa db:migrate
   pnpm medusa user -e admin@medusajs.com -p supersecret
   pnpm seed
   ```

   The seed writes the store, 241 regions, 36 locales and the demo catalog. `db:migrate` already
   runs it as a migration script, so `pnpm seed` only repeats it, and it skips everything it has
   already written.

6. Run both apps from the root of the example:
   ```bash
   cd ./examples/choose-your-example

   pnpm dev                    # for development
   pnpm build && pnpm start    # for production
   ```

   The backend serves the Admin at http://localhost:9000/app and the storefront runs at
   http://localhost:8000. Log in to the Admin with the user you created, copy the key from
   **Settings → Publishable API Keys** into `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in
   `apps/storefront/.env.local`, and restart the storefront.

7. (only for plugin development) Link the locally published plugins into the backend:
   ```bash
   cd apps/backend
   pnpm dev:local
   ```

   `dev:local` runs `medusa plugin:add` for every plugin of the example before starting the backend,
   so it picks up the copy you published in step 3. Plain `pnpm dev` installs the plugins from npm.
