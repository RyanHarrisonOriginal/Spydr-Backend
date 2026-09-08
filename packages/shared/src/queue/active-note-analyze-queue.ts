export interface ActiveNoteAnalyzeJobPayload {
  sessionId: string;
}

export const ACTIVE_NOTE_ANALYZE_QUEUE_NAME = "active-note-analyze";

export const ANALYZE_ACTIVE_NOTE_JOB_NAME = "analyze-active-note";

export const ACTIVE_NOTE_ANALYZE_DEFAULT_JOB_OPTIONS = {
  removeOnComplete: true,
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2_000,
  },
};

export const ACTIVE_NOTE_ANALYZE_LOCK_DURATION_MS = 5 * 60 * 1000;

export function buildActiveNoteAnalyzeJobId(sessionId: string): string {
  return `active-note-analyze-${sessionId}`;
}
