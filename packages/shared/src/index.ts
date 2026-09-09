export {
  buildProjectRetrievalDocument,
  formatProjectRetrievalDocument,
  normalizeRetrievalText,
} from "./retrieval/project-retrieval-document.js";
export {
  projectLoaderService,
  ProjectLoaderService,
  type LoadedProjectState,
} from "./retrieval/project-loader.service.js";
export {
  buildProjectRetrievalContextFromRows,
  createProjectRetrievalContextRows,
} from "./retrieval/project-retrieval-context.builder.js";
export { mapRelatedNodesToRetrievalRows } from "./retrieval/project-retrieval-context.mapper.js";
export type {
  ProjectRetrievalContext,
  ProjectRetrievalTask,
  ProjectRetrievalNote,
  RelatedRetrievalNode,
} from "./retrieval/project-retrieval.types.js";
export { createRetrievalContentHash } from "./content-hash.js";
export {
  PROJECT_EMBEDDING_QUEUE_NAME,
  REFRESH_PROJECT_EMBEDDING_JOB_NAME,
  PROJECT_EMBEDDING_DEBOUNCE_SECONDS,
  PROJECT_EMBEDDING_SEND_OPTIONS,
  buildProjectEmbeddingSingletonKey,
  type ProjectEmbeddingJobPayload,
} from "./queue/embedding-queue.js";
export {
  ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
  ANALYZE_ACTIVE_NOTE_JOB_NAME,
  ACTIVE_NOTE_ANALYZE_SEND_OPTIONS,
  ACTIVE_NOTE_ANALYZE_LOCK_DURATION_MS,
  buildActiveNoteAnalyzeSingletonKey,
  type ActiveNoteAnalyzeJobPayload,
} from "./queue/active-note-analyze-queue.js";
export {
  TODO_STALE_QUEUE_NAME,
  MARK_STALE_TODO_ITEMS_JOB_NAME,
  TODO_STALE_AFTER_MS,
  TODO_STALE_CRON,
  TODO_STALE_SEND_OPTIONS,
  type TodoStaleJobPayload,
} from "./queue/todo-stale-queue.js";
export { JobUnrecoverableError } from "./queue/job-unrecoverable-error.js";
export {
  PROJECT_CHILD_NODE_TYPES,
  RETRIEVAL_CHILD_NODE_TYPES,
  CLOSED_TASK_STATUSES,
  SPYDR_NODE_DEFAULT_ORDER,
  isOpenTaskStatus,
} from "./spydr-query.constants.js";
