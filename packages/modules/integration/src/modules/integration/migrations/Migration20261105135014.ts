import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261105135014 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "integration_change" ("id" text not null, "actor_type" text not null, "actor_id" text null, "actor_label" text null, "change_type" text not null, "provider_id" text not null, "diff" jsonb not null, "diff_fields" text[] not null default '{}', "request_id" text null, "ip" text null, "user_agent" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "integration_change_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_change_deleted_at" ON "integration_change" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_change_provider_id_created_at" ON "integration_change" ("provider_id", "created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_change_created_at" ON "integration_change" ("created_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_integration_change_actor_id" ON "integration_change" ("actor_id") WHERE actor_id IS NOT NULL AND deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "integration_change" cascade;`);
  }

}
