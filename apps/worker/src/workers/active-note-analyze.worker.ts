import { Worker } from "bullmq";
import { getWorkerConcurrency, createRedisConnectionOptions } from "@spydr/config";
import {
  ACTIVE_NOTE_ANALYZE_LOCK_DURATION_MS,
  ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
  type ActiveNoteAnalyzeJobPayload,
} from "@spydr/shared";
import { handleAnalyzeActiveNote } from "../jobs/analyzeActiveNote.job.js";

export function createActiveNoteAnalyzeWorker(): Worker<ActiveNoteAnalyzeJobPayload> {
  const worker = new Worker<ActiveNoteAnalyzeJobPayload>(
    ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
    async (job) => handleAnalyzeActiveNote(job),
    {
      connection: createRedisConnectionOptions(),
      concurrency: getWorkerConcurrency(),
      lockDuration: ACTIVE_NOTE_ANALYZE_LOCK_DURATION_MS,
      stalledInterval: 60_000,
    }
  );

  worker.on("ready", () => {
    console.info(
      `[worker] ${ACTIVE_NOTE_ANALYZE_QUEUE_NAME} worker ready (concurrency=${getWorkerConcurrency()})`
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[worker] Job failed (jobId=${job?.id ?? "unknown"}, name=${job?.name ?? "unknown"}): ${error.message}`
    );
  });

  worker.on("error", (error) => {
    console.error("[worker] Active note analyze worker error", error);
  });

  return worker;
}
