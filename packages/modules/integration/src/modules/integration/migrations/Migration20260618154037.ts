import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260618154037 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" drop constraint if exists "integration_provider_id_unique";`);
    this.addSql(`drop index if exists "IDX_integration_plugin_id_instance_id_unique";`);
    this.addSql(`drop index if exists "IDX_integration_plugin_kind";`);
    this.addSql(`alter table if exists "integration" drop column if exists "instance_id";`);

    this.addSql(`alter table if exists "integration" rename column "plugin_kind" to "module";`);
    this.addSql(`alter table if exists "integration" rename column "plugin_id" to "provider_id";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_integration_provider_id_unique" ON "integration" ("provider_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_module" ON "integration" ("module") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_integration_provider_id_unique";`);
    this.addSql(`drop index if exists "IDX_integration_module";`);

    this.addSql(`alter table if exists "integration" add column if not exists "instance_id" text null;`);
    this.addSql(`alter table if exists "integration" rename column "module" to "plugin_kind";`);
    this.addSql(`alter table if exists "integration" rename column "provider_id" to "plugin_id";`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_integration_plugin_id_instance_id_unique" ON "integration" ("plugin_id", "instance_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_plugin_kind" ON "integration" ("plugin_kind") WHERE deleted_at IS NULL;`);
  }

}
