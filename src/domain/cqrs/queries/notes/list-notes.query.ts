import type { INoteListItem, INoteRepository } from "../../../interfaces/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

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

  constructor(private readonly notes: INoteRepository) {}

  execute(query: ListNotesQuery): Promise<INoteListItem[]> {
    return this.notes.listByOrgWithProjects(query.orgId);
  }
}
