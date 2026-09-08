import type {
  IDecisionListItem,
  IDecisionViews,
} from "../views.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class ListDecisionsQuery implements IQuery<IDecisionListItem[]> {
  static readonly queryType = "decisions.list";
  readonly queryType = ListDecisionsQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListDecisionsQueryHandler
  implements IQueryHandler<ListDecisionsQuery, IDecisionListItem[]>
{
  readonly queryType = ListDecisionsQuery.queryType;

  constructor(private readonly decisions: IDecisionViews) {}

  execute(query: ListDecisionsQuery): Promise<IDecisionListItem[]> {
    return this.decisions.listByOrg(query.orgId);
  }
}
