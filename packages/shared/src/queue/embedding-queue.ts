export interface ProjectEmbeddingJobPayload {
  projectId: string;
}

export const PROJECT_EMBEDDING_QUEUE_NAME = "project-embedding";

export const REFRESH_PROJECT_EMBEDDING_JOB_NAME = "refresh-project-embedding";

export const PROJECT_EMBEDDING_DEFAULT_JOB_OPTIONS = {
  delay: 3_000,
  removeOnComplete: true,
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1_000,
  },
};

export function buildProjectEmbeddingJobId(projectId: string): string {
  // BullMQ rejects custom job IDs containing ":" unless split into exactly 3 segments
  // (repeatable-job format). Use a hyphen separator for per-project dedupe keys.
  return `project-embedding-${projectId}`;
}
