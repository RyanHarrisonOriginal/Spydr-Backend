import {
  ActiveNoteAnalysisError,
  ACTIVE_NOTE_PROMPT_VERSION,
  type ActiveNoteAnalyzeAccepted,
  type ActiveNoteAnalyzeRequest,
  type IActiveNoteSessionRepository,
} from "@spydr/active-notes";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class AnalyzeActiveNoteQuery implements IQuery<ActiveNoteAnalyzeAccepted> {
  static readonly queryType = "active-notes.analyze";
  readonly queryType = AnalyzeActiveNoteQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: ActiveNoteAnalyzeRequest
  ) {}
}

export class AnalyzeActiveNoteQueryHandler
  implements IQueryHandler<AnalyzeActiveNoteQuery, ActiveNoteAnalyzeAccepted>
{
  readonly queryType = AnalyzeActiveNoteQuery.queryType;

  constructor(
    private readonly sessions: IActiveNoteSessionRepository,
    private readonly enqueue: (sessionId: string) => Promise<void>,
    private readonly promptVersion: string | null = ACTIVE_NOTE_PROMPT_VERSION
  ) {}

  async execute(
    query: AnalyzeActiveNoteQuery
  ): Promise<ActiveNoteAnalyzeAccepted> {
    const content = query.input.content.trim();

    let sessionId: string;
    try {
      const session = await this.sessions.beginAnalysis({
        organizationId: query.orgId,
        userId: query.userId,
        content,
        promptVersion: this.promptVersion,
      });
      sessionId = session.id;
    } catch (error) {
      console.error("[active-note.session] begin failed", error);
      throw new ActiveNoteAnalysisError(
        "Active note analysis failed. Please try again.",
        500
      );
    }

    try {
      await this.enqueue(sessionId);
    } catch (error) {
      console.error("[active-note.session] enqueue failed", error);
      try {
        await this.sessions.failAnalysis({
          sessionId,
          failedStep: "enqueue",
          errorMessage:
            error instanceof Error ? error.message : "Failed to queue analysis",
        });
      } catch (persistError) {
        console.error("[active-note.session] fail persist failed", persistError);
      }
      throw new ActiveNoteAnalysisError(
        "Active note analysis failed. Please try again.",
        500
      );
    }

    return { sessionId, status: "analyzing" };
  }
}
