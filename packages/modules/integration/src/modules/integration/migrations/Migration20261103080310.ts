import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261103080310 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration_change" drop column if exists "outcome", drop column if exists "message";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "integration_change" add column if not exists "outcome" text not null default 'succeeded', add column if not exists "message" text null;`);
  }

}
