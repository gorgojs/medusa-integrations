import { Migration } from "@medusajs/framework/mikro-orm/migrations";

// The first migration declared the category column as `plugin_kind` with an inline check, which
// Postgres named `integration_plugin_kind_check`. Renaming the column kept that check, so next to
// `integration_category_check` it still rejected `search`, `content`, `analytics`,
// `authentication` and `file_providers`.
export class Migration20261112145044 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" drop constraint if exists "integration_plugin_kind_check";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "integration" add constraint "integration_plugin_kind_check" check("category" in ('payment', 'fulfillment', 'marketplace', 'crm', 'erp', 'pim', 'notification', 'feed', 'tax', 'other'));`);
  }

}
