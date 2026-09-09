import { PgBoss } from "pg-boss";
import { getDatabaseUrl, PG_BOSS_SCHEMA } from "./env.js";

/** Must match `@spydr/shared` queue name constants. */
const PROJECT_EMBEDDING_QUEUE_NAME = "project-embedding";
const ACTIVE_NOTE_ANALYZE_QUEUE_NAME = "active-note-analyze";

let bossPromise: Promise<PgBoss> | undefined;

async function ensureJobQueues(boss: PgBoss): Promise<void> {
  await boss.createQueue(PROJECT_EMBEDDING_QUEUE_NAME, {
    retryLimit: 2,
    retryDelay: 1,
    retryBackoff: true,
    deleteAfterSeconds: 60 * 60,
  });

  await boss.createQueue(ACTIVE_NOTE_ANALYZE_QUEUE_NAME, {
    retryLimit: 2,
    retryDelay: 2,
    retryBackoff: true,
    expireInSeconds: 5 * 60,
    heartbeatSeconds: 60,
    deleteAfterSeconds: 60 * 60,
  });
}

async function createAndStartPgBoss(): Promise<PgBoss> {
  const connectionString = getDatabaseUrl();

  const boss = new PgBoss({
    connectionString,
    schema: PG_BOSS_SCHEMA,
    // Schema objects are applied via the manual pg-boss migration.
    migrate: false,
  });

  boss.on("error", (error) => {
    console.error("[pg-boss] error", error);
  });

  await boss.start();
  await ensureJobQueues(boss);
  return boss;
}

/** Shared pg-boss instance backed by DATABASE_URL / schema `bullmq`. */
export function getPgBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = createAndStartPgBoss();
  }

  return bossPromise;
}

export async function stopPgBoss(): Promise<void> {
  if (!bossPromise) {
    return;
  }

  const pending = bossPromise;
  bossPromise = undefined;

  const boss = await pending;
  await boss.stop({ graceful: true, timeout: 30_000 });
}
