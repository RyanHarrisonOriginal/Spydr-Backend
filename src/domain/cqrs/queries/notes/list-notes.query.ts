import type { INoteRepository } from "../../../interfaces/index.js";
import type { NoteNode } from "../../../models/notes/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class ListNotesQuery implements IQuery<NoteNode[]> {
  static readonly queryType = "notes.list";
  readonly queryType = ListNotesQuery.queryType;

  constructor(readonly userId: string) {}
}

export class ListNotesQueryHandler
  implements IQueryHandler<ListNotesQuery, NoteNode[]>
{
  readonly queryType = ListNotesQuery.queryType;

  constructor(private readonly notes: INoteRepository) {}

  execute(query: ListNotesQuery): Promise<NoteNode[]> {
    return this.notes.listByUser(query.userId);
  }
}
