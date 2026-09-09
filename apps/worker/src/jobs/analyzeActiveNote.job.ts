import type { JobWithMetadata } from "pg-boss";
import {
  ActiveNoteJobUnrecoverableError,
  runAnalyzeActiveNoteJob,
} from "@spydr/active-notes";
import {
  JobUnrecoverableError,
  type ActiveNoteAnalyzeJobPayload,
} from "@spydr/shared";

export async function handleAnalyzeActiveNote(
  job: JobWithMetadata<ActiveNoteAnalyzeJobPayload>
): Promise<void> {
  const { sessionId } = job.data;
  const attempt = job.retryCount + 1;
  const maxAttempts = job.retryLimit + 1;

  console.info(
    `[job] analyze-active-note started (jobId=${job.id}, sessionId=${sessionId}, attempt=${attempt})`
  );

  try {
    await runAnalyzeActiveNoteJob(
      { sessionId },
      {
        attemptsMade: job.retryCount,
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
      throw new JobUnrecoverableError(error.message);
    }

    throw error instanceof Error ? error : new Error(message);
  }
}
