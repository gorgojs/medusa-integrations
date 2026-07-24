import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260716110756 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "integration" drop constraint if exists "integration_last_test_status_check";`);

    this.addSql(`alter table if exists "integration" add constraint "integration_last_test_status_check" check("last_test_status" in ('passed', 'failed', 'skipped'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "integration" drop constraint if exists "integration_last_test_status_check";`);

    this.addSql(`alter table if exists "integration" add constraint "integration_last_test_status_check" check("last_test_status" in ('ok', 'fail', 'skipped'));`);
  }

}
