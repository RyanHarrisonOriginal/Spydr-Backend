export const TODO_STALE_QUEUE_NAME = "todo-stale";

export const MARK_STALE_TODO_ITEMS_JOB_NAME = "mark-stale-todo-items";

/** Items older than this without removal are marked stale. */
export const TODO_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/** Cron: every 15 minutes. */
export const TODO_STALE_CRON = "*/15 * * * *";

export const TODO_STALE_SEND_OPTIONS = {
  retryLimit: 1,
  retryDelay: 5,
  retryBackoff: true as const,
};

export type TodoStaleJobPayload = Record<string, never>;
