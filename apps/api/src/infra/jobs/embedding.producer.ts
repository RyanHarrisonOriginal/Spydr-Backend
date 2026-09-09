import { getPgBoss } from "@spydr/config";
import {
  buildProjectEmbeddingSingletonKey,
  PROJECT_EMBEDDING_DEBOUNCE_SECONDS,
  PROJECT_EMBEDDING_QUEUE_NAME,
  PROJECT_EMBEDDING_SEND_OPTIONS,
  type ProjectEmbeddingJobPayload,
} from "@spydr/shared";

/**
 * Enqueue a debounced project embedding refresh.
 *
 * Intended for use from the API after project/task/decision/idea/note mutations.
 * Duplicate enqueues for the same project collapse into one delayed job via
 * pg-boss sendDebounced (singleton key + next slot).
 */
export async function enqueueProjectEmbedding(projectId: string): Promise<void> {
  const boss = await getPgBoss();
  const singletonKey = buildProjectEmbeddingSingletonKey(projectId);

  await boss.sendDebounced(
    PROJECT_EMBEDDING_QUEUE_NAME,
    { projectId } satisfies ProjectEmbeddingJobPayload,
    {
      ...PROJECT_EMBEDDING_SEND_OPTIONS,
      singletonKey,
    },
    PROJECT_EMBEDDING_DEBOUNCE_SECONDS,
    singletonKey
  );
}
