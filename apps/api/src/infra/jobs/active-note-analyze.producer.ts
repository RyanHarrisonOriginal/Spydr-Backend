import { getPgBoss } from "@spydr/config";
import {
  ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
  ACTIVE_NOTE_ANALYZE_SEND_OPTIONS,
  buildActiveNoteAnalyzeSingletonKey,
  type ActiveNoteAnalyzeJobPayload,
} from "@spydr/shared";

export async function enqueueActiveNoteAnalyze(
  sessionId: string
): Promise<void> {
  const boss = await getPgBoss();
  const singletonKey = buildActiveNoteAnalyzeSingletonKey(sessionId);

  await boss.send(
    ACTIVE_NOTE_ANALYZE_QUEUE_NAME,
    { sessionId } satisfies ActiveNoteAnalyzeJobPayload,
    {
      ...ACTIVE_NOTE_ANALYZE_SEND_OPTIONS,
      singletonKey,
    }
  );
}
