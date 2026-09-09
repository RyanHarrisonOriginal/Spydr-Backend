export interface ActiveNoteAnalyzeJobPayload {
  sessionId: string;
}

export const ACTIVE_NOTE_ANALYZE_QUEUE_NAME = "active-note-analyze";

export const ANALYZE_ACTIVE_NOTE_JOB_NAME = "analyze-active-note";

export const ACTIVE_NOTE_ANALYZE_SEND_OPTIONS = {
  retryLimit: 2,
  retryDelay: 2,
  retryBackoff: true as const,
  expireInSeconds: 5 * 60,
  heartbeatSeconds: 60,
};

export const ACTIVE_NOTE_ANALYZE_LOCK_DURATION_MS = 5 * 60 * 1000;

export function buildActiveNoteAnalyzeSingletonKey(sessionId: string): string {
  return sessionId;
}
