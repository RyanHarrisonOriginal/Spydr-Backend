/**
 * Project embedding refreshes supported Active Note retrieval.
 * That feature is sunset, so mutations no longer enqueue this job.
 */
export async function enqueueProjectEmbedding(_projectId: string): Promise<void> {
  return;
}
