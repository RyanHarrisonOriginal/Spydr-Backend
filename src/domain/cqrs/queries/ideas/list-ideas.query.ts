import type { IIdeaRepository } from "../../../interfaces/index.js";
import type { IdeaNode } from "../../../models/ideas/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class ListIdeasQuery implements IQuery<IdeaNode[]> {
  static readonly queryType = "ideas.list";
  readonly queryType = ListIdeasQuery.queryType;

  constructor(readonly userId: string) {}
}

export class ListIdeasQueryHandler
  implements IQueryHandler<ListIdeasQuery, IdeaNode[]>
{
  readonly queryType = ListIdeasQuery.queryType;

  constructor(private readonly ideas: IIdeaRepository) {}

  execute(query: ListIdeasQuery): Promise<IdeaNode[]> {
    return this.ideas.listByUser(query.userId);
  }
}
