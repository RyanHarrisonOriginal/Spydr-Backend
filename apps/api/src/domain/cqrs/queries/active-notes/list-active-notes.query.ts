import type { ActiveNoteHistoryItem } from "../../../active-notes/types/shared.js";
import type { IActiveNoteSessionRepository } from "../../../interfaces/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class ListActiveNotesQuery implements IQuery<ActiveNoteHistoryItem[]> {
  static readonly queryType = "active-notes.list";
  readonly queryType = ListActiveNotesQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListActiveNotesQueryHandler
  implements IQueryHandler<ListActiveNotesQuery, ActiveNoteHistoryItem[]>
{
  readonly queryType = ListActiveNotesQuery.queryType;

  constructor(private readonly sessions: IActiveNoteSessionRepository) {}

  execute(query: ListActiveNotesQuery): Promise<ActiveNoteHistoryItem[]> {
    return this.sessions.listHistory({
      organizationId: query.orgId,
      userId: query.userId,
    });
  }
}
