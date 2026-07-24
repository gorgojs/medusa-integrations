import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260701095518 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" rename column "schema_version" to "options_version";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "integration" rename column "options_version" to "schema_version";`);
  }

}
