import { getPgBoss, getWorkerConcurrency } from "@spydr/config";
import {
  ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
  JobUnrecoverableError,
  type ActiveNoteAnalyzeJobPayload,
} from "@spydr/shared";
import type { JobWithMetadata } from "pg-boss";
import { handleAnalyzeActiveNote } from "../jobs/analyzeActiveNote.job.js";

export async function startActiveNoteAnalyzeWorker(): Promise<string> {
  const boss = await getPgBoss();
  const concurrency = getWorkerConcurrency();

  const workerId = await boss.work(
    ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
    {
      localConcurrency: concurrency,
      includeMetadata: true as const,
      perJobResults: true as const,
      pollingIntervalSeconds: 1,
    },
    async (jobs) =>
      Promise.all(
        jobs.map(async (job) => {
          try {
            await handleAnalyzeActiveNote(
              job as JobWithMetadata<ActiveNoteAnalyzeJobPayload>
            );
            return { id: job.id, status: "completed" as const };
          } catch (error) {
            console.error(
              `[worker] Job failed (jobId=${job.id}, name=${job.name}): ${
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

  console.info(
    `[worker] ${ACTIVE_NOTE_ANALYZE_QUEUE_NAME} worker ready (concurrency=${concurrency})`
  );

  return workerId;
}
