import type { IDecisionRepository } from "../../../interfaces/index.js";
import type { DecisionNode } from "../../../models/decisions/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class ListDecisionsQuery implements IQuery<DecisionNode[]> {
  static readonly queryType = "decisions.list";
  readonly queryType = ListDecisionsQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListDecisionsQueryHandler
  implements IQueryHandler<ListDecisionsQuery, DecisionNode[]>
{
  readonly queryType = ListDecisionsQuery.queryType;

  constructor(private readonly decisions: IDecisionRepository) {}

  execute(query: ListDecisionsQuery): Promise<DecisionNode[]> {
    return this.decisions.listByOrg(query.orgId);
  }
}
