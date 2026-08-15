import { enqueueProjectEmbedding } from "./embedding.producer.js";

export type ProjectEmbeddingEnqueueFn = (
  projectId: string
) => Promise<void>;

export async function defaultEnqueueProjectEmbedding(
  projectId: string
): Promise<void> {
  await enqueueProjectEmbedding(projectId);
}

export async function tryEnqueueProjectEmbedding(
  projectId: string,
  enqueue: ProjectEmbeddingEnqueueFn = defaultEnqueueProjectEmbedding
): Promise<void> {
  try {
    console.log("[embedding] enqueue start", { projectId });
    await enqueue(projectId);
    console.log("[embedding] enqueue ok", { projectId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown enqueue error";
    console.error(
      `[embedding] Failed to enqueue project embedding refresh (projectId=${projectId}): ${message}`,
      error
    );
  }
}

export async function tryEnqueueProjectEmbeddings(
  projectIds: Iterable<string>,
  enqueue: ProjectEmbeddingEnqueueFn = defaultEnqueueProjectEmbedding
): Promise<void> {
  const uniqueProjectIds = [...new Set(projectIds)];

  await Promise.all(
    uniqueProjectIds.map((projectId) =>
      tryEnqueueProjectEmbedding(projectId, enqueue)
    )
  );
}
