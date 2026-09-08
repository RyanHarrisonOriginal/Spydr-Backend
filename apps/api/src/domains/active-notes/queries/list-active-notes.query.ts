import type { ActiveNoteHistoryItem } from "@spydr/active-notes";
import type { IActiveNoteSessionRepository } from "@spydr/active-notes";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

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
