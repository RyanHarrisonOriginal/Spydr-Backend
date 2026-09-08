import type { Job } from "bullmq";
import { UnrecoverableError } from "bullmq";
import {
  ActiveNoteJobUnrecoverableError,
  runAnalyzeActiveNoteJob,
} from "@spydr/active-notes";
import type { ActiveNoteAnalyzeJobPayload } from "@spydr/shared";

export async function handleAnalyzeActiveNote(
  job: Job<ActiveNoteAnalyzeJobPayload>
): Promise<void> {
  const { sessionId } = job.data;
  const attempt = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? 3;

  console.info(
    `[job] analyze-active-note started (jobId=${job.id}, sessionId=${sessionId}, attempt=${attempt})`
  );

  try {
    await runAnalyzeActiveNoteJob(
      { sessionId },
      {
        attemptsMade: job.attemptsMade,
        maxAttempts,
      }
    );
    console.info(
      `[job] analyze-active-note succeeded (jobId=${job.id}, sessionId=${sessionId}, attempt=${attempt})`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown active note analysis error";
    console.error(
      `[job] analyze-active-note failed (jobId=${job.id}, sessionId=${sessionId}, attempt=${attempt}): ${message}`,
      error
    );

    if (error instanceof ActiveNoteJobUnrecoverableError) {
      throw new UnrecoverableError(error.message);
    }

    throw error instanceof Error ? error : new Error(message);
  }
}
