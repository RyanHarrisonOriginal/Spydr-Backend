import type { INoteListItem, INoteViews } from "../views.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class ListNotesQuery implements IQuery<INoteListItem[]> {
  static readonly queryType = "notes.list";
  readonly queryType = ListNotesQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListNotesQueryHandler
  implements IQueryHandler<ListNotesQuery, INoteListItem[]>
{
  readonly queryType = ListNotesQuery.queryType;

  constructor(private readonly notes: INoteViews) {}

  execute(query: ListNotesQuery): Promise<INoteListItem[]> {
    return this.notes.listByOrg(query.orgId);
  }
}
