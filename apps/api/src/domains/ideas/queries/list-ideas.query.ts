import type { IIdeaListItem, IIdeaViews } from "../views.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class ListIdeasQuery implements IQuery<IIdeaListItem[]> {
  static readonly queryType = "ideas.list";
  readonly queryType = ListIdeasQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListIdeasQueryHandler
  implements IQueryHandler<ListIdeasQuery, IIdeaListItem[]>
{
  readonly queryType = ListIdeasQuery.queryType;

  constructor(private readonly ideas: IIdeaViews) {}

  execute(query: ListIdeasQuery): Promise<IIdeaListItem[]> {
    return this.ideas.listByOrg(query.orgId);
  }
}
