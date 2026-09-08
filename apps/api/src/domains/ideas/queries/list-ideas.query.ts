import type { IIdeaViews } from "../views.js";
import type { IdeaNode } from "../models/index.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class ListIdeasQuery implements IQuery<IdeaNode[]> {
  static readonly queryType = "ideas.list";
  readonly queryType = ListIdeasQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListIdeasQueryHandler
  implements IQueryHandler<ListIdeasQuery, IdeaNode[]>
{
  readonly queryType = ListIdeasQuery.queryType;

  constructor(private readonly ideas: IIdeaViews) {}

  execute(query: ListIdeasQuery): Promise<IdeaNode[]> {
    return this.ideas.listByOrg(query.orgId);
  }
}
