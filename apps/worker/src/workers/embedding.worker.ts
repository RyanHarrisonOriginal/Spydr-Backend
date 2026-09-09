import { getPgBoss, getWorkerConcurrency } from "@spydr/config";
import {
  JobUnrecoverableError,
  PROJECT_EMBEDDING_QUEUE_NAME,
  type ProjectEmbeddingJobPayload,
} from "@spydr/shared";
import type { JobWithMetadata } from "pg-boss";
import { handleRefreshProjectEmbedding } from "../jobs/refreshProjectEmbedding.job.js";

export async function startEmbeddingWorker(): Promise<string> {
  const boss = await getPgBoss();
  const concurrency = getWorkerConcurrency();

  const workerId = await boss.work(
    PROJECT_EMBEDDING_QUEUE_NAME,
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
            const output = await handleRefreshProjectEmbedding(
              job as JobWithMetadata<ProjectEmbeddingJobPayload>
            );
            return { id: job.id, status: "completed" as const, output };
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
    `[worker] ${PROJECT_EMBEDDING_QUEUE_NAME} worker ready (concurrency=${concurrency})`
  );

  return workerId;
}
