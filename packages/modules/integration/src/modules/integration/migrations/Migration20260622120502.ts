import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260622120502 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" rename column "settings" to "options";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "integration" rename column "options" to "settings";`);
  }

}
