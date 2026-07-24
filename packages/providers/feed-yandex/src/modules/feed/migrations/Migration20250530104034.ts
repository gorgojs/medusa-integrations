import { Migration } from '@mikro-orm/migrations';

export class Migration20250530104034 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "feed" ("id" text not null, "title" text null, "file_name" text null, "file_path" text null, "last_export_at" timestamptz null, "is_active" boolean not null default false, "schedule" integer not null default 30, "settings" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "feed_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_feed_deleted_at" ON "feed" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "feed" cascade;`);
  }

}
