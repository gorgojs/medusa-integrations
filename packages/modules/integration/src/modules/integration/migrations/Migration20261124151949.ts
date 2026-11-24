import { Migration } from "@medusajs/framework/mikro-orm/migrations";

// `last_test_status` becomes `last_test`, which also keeps the test's time and message. A stored
// status moves over with the row's `updated_at` as its time, because the old column kept no time.
export class Migration20261124151949 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" add column if not exists "last_test" jsonb null;`);

    this.addSql(`update "integration" set "last_test" = jsonb_build_object('status', "last_test_status", 'tested_at', to_char("updated_at" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'message', null) where "last_test_status" is not null;`);

    this.addSql(`alter table if exists "integration" drop column if exists "last_test_status";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "integration" add column if not exists "last_test_status" text check ("last_test_status" in ('passed', 'failed', 'skipped')) null;`);

    this.addSql(`update "integration" set "last_test_status" = "last_test"->>'status' where "last_test"->>'status' in ('passed', 'failed', 'skipped');`);

    this.addSql(`alter table if exists "integration" drop column if exists "last_test";`);
  }

}
