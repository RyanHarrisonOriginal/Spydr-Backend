import type {
  IDecisionListItem,
  IDecisionRepository,
} from "../../../interfaces/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

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

  constructor(private readonly decisions: IDecisionRepository) {}

  execute(query: ListDecisionsQuery): Promise<IDecisionListItem[]> {
    return this.decisions.listByOrgWithProjects(query.orgId);
  }
}
