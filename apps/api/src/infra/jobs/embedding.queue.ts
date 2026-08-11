import { Queue } from "bullmq";
import { createRedisConnectionOptions } from "@spydr/config";
import {
  PROJECT_EMBEDDING_DEFAULT_JOB_OPTIONS,
  PROJECT_EMBEDDING_QUEUE_NAME,
  type ProjectEmbeddingJobPayload,
} from "@spydr/shared";

let projectEmbeddingQueue: Queue<ProjectEmbeddingJobPayload> | undefined;

export function getProjectEmbeddingQueue(): Queue<ProjectEmbeddingJobPayload> {
  if (!projectEmbeddingQueue) {
    projectEmbeddingQueue = new Queue<ProjectEmbeddingJobPayload>(
      PROJECT_EMBEDDING_QUEUE_NAME,
      {
        connection: createRedisConnectionOptions(),
        defaultJobOptions: PROJECT_EMBEDDING_DEFAULT_JOB_OPTIONS,
      }
    );
  }

  return projectEmbeddingQueue;
}

export async function closeProjectEmbeddingQueue(): Promise<void> {
  if (projectEmbeddingQueue) {
    await projectEmbeddingQueue.close();
    projectEmbeddingQueue = undefined;
  }
}
