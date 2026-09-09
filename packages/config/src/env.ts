import "./load-env.js";

/** Postgres schema used by pg-boss (separate from Prisma `public` tables). */
export const PG_BOSS_SCHEMA = "bullmq";

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for pg-boss");
  }
  return url;
}

export function getWorkerConcurrency(): number {
  const parsed = Number(process.env.WORKER_CONCURRENCY ?? 5);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 5;
  }

  return Math.floor(parsed);
}
