import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261112133108 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" add column if not exists "metadata" jsonb null;`);

    this.addSql(`alter table if exists "integration_change" add column if not exists "metadata" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "integration" drop column if exists "metadata";`);

    this.addSql(`alter table if exists "integration_change" drop column if exists "metadata";`);
  }

}
