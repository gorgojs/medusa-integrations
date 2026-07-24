# Examples for Medusa Gorgo plugins 

Handy examples for Medusa Gorgo plugins.

## Prerequisites

- Node.js v20+
- Yarn
- Docker & Docker Compose (optional, for spinning up PosgreSQL)

## Installation & Development

To install any example do the following:

1. Clone the repository and change to examples:
   ```bash
   git clone https://github.com/gorgojs/medusa-integrations
   cd medusa-plugins
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

4. Install and run any **Medusa example**:
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

5. Install and run any **Medusa Storefront example**:
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
