import {
  buildProjectEmbeddingJobId,
  PROJECT_EMBEDDING_DEFAULT_JOB_OPTIONS,
  REFRESH_PROJECT_EMBEDDING_JOB_NAME,
  type ProjectEmbeddingJobPayload,
} from "@spydr/shared";
import { getProjectEmbeddingQueue } from "./embedding.queue.js";

const DEBOUNCE_RESET_STATES = new Set([
  "delayed",
  "waiting",
  "waiting-children",
  "prioritized",
]);

/**
 * Enqueue a debounced project embedding refresh.
 *
 * Intended for use from the API after project/task/decision/idea/note mutations.
 * Duplicate enqueues for the same project reset the 3-second delay window.
 */
export async function enqueueProjectEmbedding(projectId: string): Promise<void> {
  const queue = getProjectEmbeddingQueue();
  const jobId = buildProjectEmbeddingJobId(projectId);

  const existingJob = await queue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (DEBOUNCE_RESET_STATES.has(state)) {
      await existingJob.remove();
    }
  }

  await queue.add(
    REFRESH_PROJECT_EMBEDDING_JOB_NAME,
    { projectId } satisfies ProjectEmbeddingJobPayload,
    {
      jobId,
      ...PROJECT_EMBEDDING_DEFAULT_JOB_OPTIONS,
    }
  );
}
