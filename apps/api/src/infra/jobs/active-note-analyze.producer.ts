import {
  ANALYZE_ACTIVE_NOTE_JOB_NAME,
  ACTIVE_NOTE_ANALYZE_DEFAULT_JOB_OPTIONS,
  buildActiveNoteAnalyzeJobId,
  type ActiveNoteAnalyzeJobPayload,
} from "@spydr/shared";
import { getActiveNoteAnalyzeQueue } from "./active-note-analyze.queue.js";

export async function enqueueActiveNoteAnalyze(
  sessionId: string
): Promise<void> {
  const queue = getActiveNoteAnalyzeQueue();
  await queue.add(
    ANALYZE_ACTIVE_NOTE_JOB_NAME,
    { sessionId } satisfies ActiveNoteAnalyzeJobPayload,
    {
      jobId: buildActiveNoteAnalyzeJobId(sessionId),
      ...ACTIVE_NOTE_ANALYZE_DEFAULT_JOB_OPTIONS,
    }
  );
}
