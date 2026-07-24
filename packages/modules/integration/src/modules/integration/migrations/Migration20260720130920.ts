import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260720130920 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop index if exists "IDX_integration_module";`);

    this.addSql(`alter table if exists "integration" rename column "module" to "category";`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_category" ON "integration" ("category") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_integration_category";`);

    this.addSql(`alter table if exists "integration" rename column "category" to "module";`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_module" ON "integration" ("module") WHERE deleted_at IS NULL;`);
  }

}
