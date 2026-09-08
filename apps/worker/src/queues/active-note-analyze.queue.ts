import { Queue } from "bullmq";
import { createRedisConnectionOptions } from "@spydr/config";
import {
  ACTIVE_NOTE_ANALYZE_DEFAULT_JOB_OPTIONS,
  ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
  type ActiveNoteAnalyzeJobPayload,
} from "@spydr/shared";

let activeNoteAnalyzeQueue: Queue<ActiveNoteAnalyzeJobPayload> | undefined;

export function getActiveNoteAnalyzeQueue(): Queue<ActiveNoteAnalyzeJobPayload> {
  if (!activeNoteAnalyzeQueue) {
    activeNoteAnalyzeQueue = new Queue<ActiveNoteAnalyzeJobPayload>(
      ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
      {
        connection: createRedisConnectionOptions(),
        defaultJobOptions: ACTIVE_NOTE_ANALYZE_DEFAULT_JOB_OPTIONS,
      }
    );
  }

  return activeNoteAnalyzeQueue;
}

export async function closeActiveNoteAnalyzeQueue(): Promise<void> {
  if (activeNoteAnalyzeQueue) {
    await activeNoteAnalyzeQueue.close();
    activeNoteAnalyzeQueue = undefined;
  }
}

export {
  ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
  ANALYZE_ACTIVE_NOTE_JOB_NAME,
} from "@spydr/shared";
