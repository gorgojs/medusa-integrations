import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260610215533 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" drop constraint if exists "integration_plugin_id_instance_id_unique";`);
    this.addSql(`create table if not exists "integration" ("id" text not null, "plugin_kind" text check ("plugin_kind" in ('payment', 'fulfillment', 'marketplace', 'crm', 'erp', 'pim', 'notification', 'feed', 'tax', 'other')) not null, "plugin_id" text not null, "instance_id" text null, "title" text null, "credentials_ciphertext" text null, "credentials_iv" text null, "settings" jsonb not null default '{}', "schema_version" integer not null default 1, "is_enabled" boolean not null default true, "last_test_at" timestamptz null, "last_test_status" text check ("last_test_status" in ('ok', 'fail', 'skipped')) null, "last_test_message" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "integration_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_deleted_at" ON "integration" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_integration_plugin_id_instance_id_unique" ON "integration" ("plugin_id", "instance_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_plugin_kind" ON "integration" ("plugin_kind") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "integration" cascade;`);
  }

}
