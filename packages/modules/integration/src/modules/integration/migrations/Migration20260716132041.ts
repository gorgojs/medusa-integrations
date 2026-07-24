import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260716132041 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" drop column if exists "options_version", drop column if exists "last_test_at", drop column if exists "last_test_message";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "integration" add column if not exists "options_version" integer not null default 1, add column if not exists "last_test_at" timestamptz null, add column if not exists "last_test_message" text null;`);
  }

}
