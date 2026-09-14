import {
  loadEnv,
  getDatabaseUrl,
  PG_BOSS_SCHEMA,
  PG_BOSS_LEGACY_SCHEMA,
} from "@spydr/config";
import { PgBoss } from "pg-boss";
import { Client } from "pg";

loadEnv();

/**
 * `ALTER SCHEMA … RENAME` moves objects, but PL/pgSQL bodies keep the old
 * schema name as text (`INSERT INTO bullmq.queue`). pg-boss then no-ops
 * migrate when `version` is already current, and `create_queue` fails with
 * parserOpenTable / relation does not exist.
 */
async function rewriteLegacyFunctionBodies(client: Client): Promise<void> {
  const { rows } = await client.query<{ def: string }>(
    `
    SELECT pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = $1
      AND pg_get_functiondef(p.oid) LIKE $2
    `,
    [PG_BOSS_SCHEMA, `%${PG_BOSS_LEGACY_SCHEMA}%`]
  );

  if (rows.length === 0) {
    return;
  }

  for (const row of rows) {
    await client.query(
      row.def.replaceAll(PG_BOSS_LEGACY_SCHEMA, PG_BOSS_SCHEMA)
    );
  }

  console.info(
    `[pg-boss migrate] Rewrote ${rows.length} function(s) that still referenced schema "${PG_BOSS_LEGACY_SCHEMA}".`
  );
}

async function assertQueueCatalog(client: Client): Promise<void> {
  const { rows } = await client.query<{ queue: string | null }>(
    `SELECT to_regclass($1) AS queue`,
    [`${PG_BOSS_SCHEMA}.queue`]
  );

  if (!rows[0]?.queue) {
    throw new Error(
      `pg-boss catalog ${PG_BOSS_SCHEMA}.queue does not exist. ` +
        `Schema objects were not created; check DATABASE_URL and re-run this migrate.`
    );
  }
}

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
      await rewriteLegacyFunctionBodies(client);
      return;
    }

    if (names.has(PG_BOSS_LEGACY_SCHEMA)) {
      await client.query(
        `ALTER SCHEMA "${PG_BOSS_LEGACY_SCHEMA}" RENAME TO "${PG_BOSS_SCHEMA}"`
      );
      console.info(
        `[pg-boss migrate] Renamed schema "${PG_BOSS_LEGACY_SCHEMA}" → "${PG_BOSS_SCHEMA}".`
      );
      await rewriteLegacyFunctionBodies(client);
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

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await rewriteLegacyFunctionBodies(client);
    await assertQueueCatalog(client);
  } finally {
    await client.end();
  }

  console.info(
    `[pg-boss migrate] Schema "${PG_BOSS_SCHEMA}" is ready with pg-boss objects.`
  );
}

main().catch((error) => {
  console.error("[pg-boss migrate] failed", error);
  process.exit(1);
});
