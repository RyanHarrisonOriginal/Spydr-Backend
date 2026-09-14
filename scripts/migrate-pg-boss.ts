import {
  loadEnv,
  getDatabaseUrl,
  PG_BOSS_SCHEMA,
  PG_BOSS_LEGACY_SCHEMA,
} from "@spydr/config";
import { PgBoss } from "pg-boss";
import { Client } from "pg";

loadEnv();

async function promoteLegacySchema(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const { rows } = await client.query<{ nspname: string }>(
      `SELECT nspname FROM pg_namespace WHERE nspname = ANY($1::text[])`,
      [[PG_BOSS_LEGACY_SCHEMA, PG_BOSS_SCHEMA]]
    );
    const names = new Set(rows.map((row) => row.nspname));

    if (names.has(PG_BOSS_SCHEMA)) {
      if (names.has(PG_BOSS_LEGACY_SCHEMA)) {
        console.info(
          `[pg-boss migrate] Both "${PG_BOSS_LEGACY_SCHEMA}" and "${PG_BOSS_SCHEMA}" exist; leaving legacy schema in place for manual cleanup.`
        );
      }
      return;
    }

    if (names.has(PG_BOSS_LEGACY_SCHEMA)) {
      await client.query(
        `ALTER SCHEMA "${PG_BOSS_LEGACY_SCHEMA}" RENAME TO "${PG_BOSS_SCHEMA}"`
      );
      console.info(
        `[pg-boss migrate] Renamed schema "${PG_BOSS_LEGACY_SCHEMA}" → "${PG_BOSS_SCHEMA}".`
      );
    }
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const connectionString = getDatabaseUrl();

  await promoteLegacySchema(connectionString);

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
