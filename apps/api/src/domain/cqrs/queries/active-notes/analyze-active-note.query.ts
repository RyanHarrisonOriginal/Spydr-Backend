import {
  ActiveNoteAnalysisError,
  ACTIVE_NOTE_PROMPT_VERSION,
  type ActiveNoteAIOutput,
  type ActiveNoteAIProvider,
  type ActiveNoteAnalyzeRequest,
  type ActiveNoteAnalyzeResult,
  type ActiveNotePipelineRecorder,
} from "../../../active-notes/index.js";
import type { IActiveNoteSessionRepository } from "../../../interfaces/active-note-session-repository.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class AnalyzeActiveNoteQuery implements IQuery<ActiveNoteAnalyzeResult> {
  static readonly queryType = "active-notes.analyze";
  readonly queryType = AnalyzeActiveNoteQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: ActiveNoteAnalyzeRequest
  ) {}
}

export class AnalyzeActiveNoteQueryHandler
  implements IQueryHandler<AnalyzeActiveNoteQuery, ActiveNoteAnalyzeResult>
{
  readonly queryType = AnalyzeActiveNoteQuery.queryType;

  constructor(
    private readonly aiProvider: ActiveNoteAIProvider,
    private readonly sessions?: IActiveNoteSessionRepository
  ) {}

  async execute(query: AnalyzeActiveNoteQuery): Promise<ActiveNoteAnalyzeResult> {
    const content = query.input.content.trim();
    const sessionId = await this.beginSession(query, content);
    const recorder = this.createRecorder(sessionId);

    try {
      const result = await this.aiProvider.analyze({
        content,
        orgId: query.orgId,
        userId: query.userId,
        recorder,
      });
      await this.completeSession(sessionId, result);
      return { ...result, sessionId: sessionId ?? null };
    } catch (error) {
      if (error instanceof ActiveNoteAnalysisError) {
        throw error;
      }
      throw new ActiveNoteAnalysisError(
        "Active note analysis failed. Please try again."
      );
    }
  }

  private async beginSession(
    query: AnalyzeActiveNoteQuery,
    content: string
  ): Promise<string | undefined> {
    if (!this.sessions) {
      return undefined;
    }

    try {
      const session = await this.sessions.beginAnalysis({
        organizationId: query.orgId,
        userId: query.userId,
        content,
        promptVersion: ACTIVE_NOTE_PROMPT_VERSION,
      });
      return session.id;
    } catch (error) {
      console.error("[active-note.session] begin failed", error);
      return undefined;
    }
  }

  private createRecorder(
    sessionId: string | undefined
  ): ActiveNotePipelineRecorder | undefined {
    const sessions = this.sessions;
    if (!sessionId || !sessions) {
      return undefined;
    }

    return {
      async recordStep(step, payload) {
        try {
          await sessions.recordStep({ sessionId, step, payload });
        } catch (error) {
          console.error("[active-note.session] step persist failed", {
            step,
            error,
          });
        }
      },
      async recordFailure(step, error) {
        try {
          await sessions.failAnalysis({
            sessionId,
            failedStep: step,
            errorMessage: error.message,
          });
        } catch (persistError) {
          console.error("[active-note.session] fail persist failed", persistError);
        }
      },
    };
  }

  private async completeSession(
    sessionId: string | undefined,
    result: ActiveNoteAIOutput
  ): Promise<void> {
    if (!sessionId || !this.sessions) {
      return;
    }

    try {
      await this.sessions.completeAnalysis({
        sessionId,
        analyzeResponse: result,
      });
    } catch (error) {
      console.error("[active-note.session] complete failed", error);
    }
  }
}
