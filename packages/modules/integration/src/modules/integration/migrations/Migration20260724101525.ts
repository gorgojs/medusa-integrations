import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260724101525 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" drop constraint if exists "integration_category_check";`);

    this.addSql(`alter table if exists "integration" add constraint "integration_category_check" check("category" in ('payment', 'notification', 'fulfillment', 'search', 'content', 'analytics', 'authentication', 'erp', 'crm', 'pim', 'marketplace', 'feed', 'file_providers', 'other'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "integration" drop constraint if exists "integration_category_check";`);

    this.addSql(`alter table if exists "integration" add constraint "integration_category_check" check("category" in ('payment', 'fulfillment', 'marketplace', 'crm', 'erp', 'pim', 'notification', 'feed', 'tax', 'other'));`);
  }

}
