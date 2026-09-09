import { loadEnv, getDatabaseUrl, PG_BOSS_SCHEMA } from "@spydr/config";
import { PgBoss } from "pg-boss";

loadEnv();

async function main(): Promise<void> {
  const connectionString = getDatabaseUrl();

  const boss = new PgBoss({
    connectionString,
    schema: PG_BOSS_SCHEMA,
    migrate: true,
    createSchema: true,
    // Migration-only process — no workers/supervision.
    schedule: false,
    supervise: false,
  });

  boss.on("error", (error) => {
    console.error("[pg-boss migrate] error", error);
  });

  console.info(
    `[pg-boss migrate] Creating/migrating schema "${PG_BOSS_SCHEMA}" on DATABASE_URL database...`
  );

  await boss.start();
  await boss.stop({ graceful: false, timeout: 5_000 });

  console.info(
    `[pg-boss migrate] Schema "${PG_BOSS_SCHEMA}" is ready with pg-boss objects.`
  );
}

main().catch((error) => {
  console.error("[pg-boss migrate] failed", error);
  process.exit(1);
});
