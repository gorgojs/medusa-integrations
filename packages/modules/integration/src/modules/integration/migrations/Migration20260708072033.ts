import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260708072033 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" drop column if exists "credentials_ciphertext", drop column if exists "credentials_iv";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "integration" add column if not exists "credentials_ciphertext" text null, add column if not exists "credentials_iv" text null;`);
  }

}
