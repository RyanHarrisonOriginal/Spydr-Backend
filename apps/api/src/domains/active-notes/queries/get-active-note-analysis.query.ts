import {
  ActiveNoteAnalysisError,
  toActiveNoteAnalysisSnapshot,
  type ActiveNoteAnalysisSnapshot,
  type IActiveNoteSessionRepository,
} from "@spydr/active-notes";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class GetActiveNoteAnalysisQuery
  implements IQuery<ActiveNoteAnalysisSnapshot>
{
  static readonly queryType = "active-notes.get-analysis";
  readonly queryType = GetActiveNoteAnalysisQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly sessionId: string
  ) {}
}

export class GetActiveNoteAnalysisQueryHandler
  implements
    IQueryHandler<GetActiveNoteAnalysisQuery, ActiveNoteAnalysisSnapshot>
{
  readonly queryType = GetActiveNoteAnalysisQuery.queryType;

  constructor(private readonly sessions: IActiveNoteSessionRepository) {}

  async execute(
    query: GetActiveNoteAnalysisQuery
  ): Promise<ActiveNoteAnalysisSnapshot> {
    const record = await this.sessions.getForUser({
      sessionId: query.sessionId,
      organizationId: query.orgId,
      userId: query.userId,
    });

    if (!record) {
      throw new ActiveNoteAnalysisError("Active note analysis not found", 404);
    }

    return toActiveNoteAnalysisSnapshot(record);
  }
}
