import { prisma } from "@spydr/db";
import type { ActiveNoteAnalyzeJobPayload } from "@spydr/shared";
import { AnalyzeActiveNoteService } from "../domain/analyze-active-note.service.js";
import type { ActiveNotePipelineRecorder } from "../domain/index.js";
import { createActiveNotePorts } from "../ai/create-active-note-ports.js";
import type { IActiveNoteSessionRepository } from "../session/active-note-session-repository.js";
import { PostgresActiveNoteSessionRepository } from "../session/postgres-active-note-session.repository.js";

export class ActiveNoteJobUnrecoverableError extends Error {
  readonly unrecoverable = true as const;

  constructor(message: string) {
    super(message);
    this.name = "ActiveNoteJobUnrecoverableError";
  }
}

export interface AnalyzeActiveNoteJobDeps {
  sessions: IActiveNoteSessionRepository;
  analyzer: AnalyzeActiveNoteService;
}

const TERMINAL_SKIP_STATUSES = new Set(["review", "applying", "completed", "failed"]);

export async function runAnalyzeActiveNoteJob(
  payload: ActiveNoteAnalyzeJobPayload,
  options: {
    attemptsMade: number;
    maxAttempts: number;
    deps?: AnalyzeActiveNoteJobDeps;
  }
): Promise<void> {
  const sessions =
    options.deps?.sessions ?? new PostgresActiveNoteSessionRepository(prisma);
  const session = await sessions.getById(payload.sessionId);

  if (!session) {
    throw new ActiveNoteJobUnrecoverableError(
      `Active note session not found: ${payload.sessionId}`
    );
  }

  if (TERMINAL_SKIP_STATUSES.has(session.status)) {
    return;
  }

  const analyzer =
    options.deps?.analyzer ??
    new AnalyzeActiveNoteService(createActiveNotePorts());

  try {
    const result = await analyzer.analyze({
      content: session.content,
      orgId: session.organizationId,
      userId: session.userId,
      recorder: createRecorder(sessions, session.id),
    });
    await sessions.completeAnalysis({
      sessionId: session.id,
      analyzeResponse: result,
    });
  } catch (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    const isLastAttempt = options.attemptsMade + 1 >= options.maxAttempts;
    if (isLastAttempt) {
      try {
        await sessions.failAnalysis({
          sessionId: session.id,
          failedStep: "analyze",
          errorMessage: failure.message,
        });
      } catch (persistError) {
        console.error("[active-note.job] failed to persist analysis failure", {
          sessionId: session.id,
          persistError,
        });
      }
    }
    throw failure;
  }
}

function createRecorder(
  sessions: IActiveNoteSessionRepository,
  sessionId: string
): ActiveNotePipelineRecorder {
  return {
    async recordStep(step, payload) {
      try {
        await sessions.recordStep({ sessionId, step, payload });
      } catch (error) {
        console.error("[active-note.job] step persist failed", { step, error });
      }
    },
    async recordFailure() {
      // Persist failed only after BullMQ's last attempt so retries can re-run.
    },
  };
}
