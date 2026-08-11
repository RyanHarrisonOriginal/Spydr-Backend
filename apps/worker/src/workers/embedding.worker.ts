import { Worker } from "bullmq";
import { getWorkerConcurrency, createRedisConnectionOptions } from "@spydr/config";
import { PROJECT_EMBEDDING_QUEUE_NAME } from "@spydr/shared";
import { handleRefreshProjectEmbedding } from "../jobs/refreshProjectEmbedding.job.js";
import type { ProjectEmbeddingJobPayload } from "@spydr/shared";

export function createEmbeddingWorker(): Worker<ProjectEmbeddingJobPayload> {
  const worker = new Worker<ProjectEmbeddingJobPayload>(
    PROJECT_EMBEDDING_QUEUE_NAME,
    async (job) => handleRefreshProjectEmbedding(job),
    {
      connection: createRedisConnectionOptions(),
      concurrency: getWorkerConcurrency(),
    }
  );

  worker.on("ready", () => {
    console.info(
      `[worker] ${PROJECT_EMBEDDING_QUEUE_NAME} worker ready (concurrency=${getWorkerConcurrency()})`
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[worker] Job failed (jobId=${job?.id ?? "unknown"}, name=${job?.name ?? "unknown"}): ${error.message}`
    );
  });

  worker.on("error", (error) => {
    console.error("[worker] Worker error", error);
  });

  return worker;
}
