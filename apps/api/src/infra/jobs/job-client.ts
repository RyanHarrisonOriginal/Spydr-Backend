import { getPgBoss, stopPgBoss } from "@spydr/config";

export { getPgBoss, stopPgBoss };

/** Ensures the shared pg-boss client is started (creates job queues if needed). */
export async function startJobClient(): Promise<void> {
  await getPgBoss();
}

export async function closeJobClient(): Promise<void> {
  await stopPgBoss();
}
