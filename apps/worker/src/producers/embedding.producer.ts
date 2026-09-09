import { getPgBoss } from "@spydr/config";
import {
  buildProjectEmbeddingSingletonKey,
  PROJECT_EMBEDDING_DEBOUNCE_SECONDS,
  PROJECT_EMBEDDING_QUEUE_NAME,
  PROJECT_EMBEDDING_SEND_OPTIONS,
  type ProjectEmbeddingJobPayload,
} from "@spydr/shared";

/** Worker-local producer for scripts and operational tooling. */
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
