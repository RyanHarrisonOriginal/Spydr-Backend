import { getPgBoss } from "@spydr/config";
import {
  JobUnrecoverableError,
  TODO_STALE_CRON,
  TODO_STALE_QUEUE_NAME,
  TODO_STALE_SEND_OPTIONS,
} from "@spydr/shared";
import { handleMarkStaleTodoItems } from "../jobs/markStaleTodoItems.job.js";

export async function startTodoStaleWorker(): Promise<string> {
  const boss = await getPgBoss();

  await boss.schedule(TODO_STALE_QUEUE_NAME, TODO_STALE_CRON, {}, TODO_STALE_SEND_OPTIONS);

  const workerId = await boss.work(
    TODO_STALE_QUEUE_NAME,
    {
      localConcurrency: 1,
      pollingIntervalSeconds: 5,
    },
    async (jobs) =>
      Promise.all(
        jobs.map(async (job) => {
          try {
            const output = await handleMarkStaleTodoItems();
            return { id: job.id, status: "completed" as const, output };
          } catch (error) {
            console.error(
              `[worker] Job failed (jobId=${job.id}, queue=${TODO_STALE_QUEUE_NAME}): ${
                error instanceof Error ? error.message : String(error)
              }`
            );

            if (error instanceof JobUnrecoverableError) {
              return {
                id: job.id,
                status: "deadletter" as const,
                output: error,
              };
            }

            return { id: job.id, status: "failed" as const, output: error };
          }
        })
      )
  );

  console.info(`[worker] ${TODO_STALE_QUEUE_NAME} worker ready (cron=${TODO_STALE_CRON})`);
  return workerId;
}
