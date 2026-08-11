import {
  buildProjectEmbeddingJobId,
  PROJECT_EMBEDDING_DEFAULT_JOB_OPTIONS,
  REFRESH_PROJECT_EMBEDDING_JOB_NAME,
  type ProjectEmbeddingJobPayload,
} from "@spydr/shared";
import { getProjectEmbeddingQueue } from "../queues/embedding.queue.js";

const DEBOUNCE_RESET_STATES = new Set([
  "delayed",
  "waiting",
  "waiting-children",
  "prioritized",
]);

/** Worker-local producer for scripts and operational tooling. */
export async function enqueueProjectEmbedding(projectId: string): Promise<void> {
  const queue = getProjectEmbeddingQueue();
  const jobId = buildProjectEmbeddingJobId(projectId);

  // #region agent log
  fetch('http://127.0.0.1:7670/ingest/a84b944b-bff5-40b6-82ea-1d226d798d7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e00087'},body:JSON.stringify({sessionId:'e00087',location:'embedding.producer.ts:enqueueProjectEmbedding',message:'pre queue.add jobId',data:{projectId,jobId,jobIdHasColon:jobId.includes(':'),jobIdColonSplitLength:jobId.split(':').length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  const existingJob = await queue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (DEBOUNCE_RESET_STATES.has(state)) {
      await existingJob.remove();
    }
  }

  try {
    await queue.add(
      REFRESH_PROJECT_EMBEDDING_JOB_NAME,
      { projectId } satisfies ProjectEmbeddingJobPayload,
      {
        jobId,
        ...PROJECT_EMBEDDING_DEFAULT_JOB_OPTIONS,
      }
    );
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7670/ingest/a84b944b-bff5-40b6-82ea-1d226d798d7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'e00087'},body:JSON.stringify({sessionId:'e00087',location:'embedding.producer.ts:enqueueProjectEmbedding',message:'queue.add failed',data:{projectId,jobId,errorMessage:error instanceof Error?error.message:String(error)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    throw error;
  }
}
