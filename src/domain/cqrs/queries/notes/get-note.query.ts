import type { INoteListItem, INoteRepository } from "../../../interfaces/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class GetNoteQuery implements IQuery<INoteListItem | null> {
  static readonly queryType = "notes.get";
  readonly queryType = GetNoteQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly noteId: string
  ) {}
}

export class GetNoteQueryHandler
  implements IQueryHandler<GetNoteQuery, INoteListItem | null>
{
  readonly queryType = GetNoteQuery.queryType;

  constructor(private readonly notes: INoteRepository) {}

  execute(query: GetNoteQuery): Promise<INoteListItem | null> {
    return this.notes.getListItemForOrg(query.orgId, query.noteId);
  }
}
