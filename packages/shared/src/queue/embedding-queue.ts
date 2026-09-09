export interface ProjectEmbeddingJobPayload {
  projectId: string;
}

export const PROJECT_EMBEDDING_QUEUE_NAME = "project-embedding";

export const REFRESH_PROJECT_EMBEDDING_JOB_NAME = "refresh-project-embedding";

/** Debounce window (seconds) before a project embedding refresh runs. */
export const PROJECT_EMBEDDING_DEBOUNCE_SECONDS = 3;

export const PROJECT_EMBEDDING_SEND_OPTIONS = {
  retryLimit: 2,
  retryDelay: 1,
  retryBackoff: true as const,
};

export function buildProjectEmbeddingSingletonKey(projectId: string): string {
  return projectId;
}
